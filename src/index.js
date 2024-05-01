import { initializeGraph, batchActions } from '@roam-research/roam-api-sdk';
import graphTokenPanel from './components/graphTokens';
import { showToast } from './components/toast';
import MyAlert from './components/alerts';
import createOverlayRender from "roamjs-components/util/createOverlayRender";
import ParentBlockSetting from './components/parentBlockToggle';

function getGraphInfo(extensionAPI) {
    return extensionAPI.settings.get('graphInfo') || []
  }
function getDefaultGraph(extensionAPI) {
    return extensionAPI.settings.get('default-graph') || getGraphInfo(extensionAPI)[0]
}

function createBlockAction(actionObject) {
    // actionType,
    // parentUID,
    // string,
    // uid,
    // open,
    // heading,
    // textAlign,
    // childViewType,
    // order="last"
    const location = {
        "parent-uid": actionObject.parentUID,
    };
    const block = {
        "string": actionObject.string,
    };
    if (!actionObject.hasOwnProperty("order")) {
        location.order = "last";
      } else{
        location.order = actionObject.order;
      }
    if (actionObject.uid !== undefined) {
        block["uid"] = actionObject.uid;
    }
    if (actionObject.open !== undefined) {
        block["open"] = actionObject.open;
    }
    if (actionObject.heading !== undefined) {
        block["heading"] = actionObject.heading;
    }
    if (actionObject.textAlign !== undefined) {
        block["text-align"] = actionObject.textAlign;
    }
    if (actionObject.textAlign !== undefined) {
        block["text-align"] = actionObject.textAlign;
    }
    if (actionObject.childViewType !== undefined) {
        block["children-view-type"] = actionObject.childViewType;
    }

    return {
        "action": actionObject.actionType,
        "location": location,
        "block": block
    };
}

// TODO resolve block embeds
// {{[[embed]]: ((BLOCK_REF))}}
// blockText = blockText.replace(/{{\[{0,2}embed.*?(\(\(.*?\)\)).*?}}/g, '$1');
async function resolveBlockRefs(origBlockString) {
    const blockRegex = /(?<=\(\()\b(.*?)\b(?=\)\))(?![^{]*}})/g;
    const embedRegex = /{{\[{0,2}embed.*?(\(\(.*?\)\)).*?}}/g;

    let resolvedStr = origBlockString;

    // Resolve block references
    let blockMatch;
    while ((blockMatch = blockRegex.exec(origBlockString)) !== null) {
        const blockUid = blockMatch[0];        
        if (blockUid) {
            let blockText = await window.roamAlphaAPI.pull("[:block/string]", `[:block/uid "${blockUid}"]`)[':block/string'];
            if (blockText) {
                // Recursively resolve any block references in the fetched block text
                blockText = await resolveBlockRefs(blockText);
                // Replace the original block reference with the resolved block text
                resolvedStr = resolvedStr.replace(`((${blockUid}))`, blockText);
            }
        }
    }

    // Resolve block embeds
    let embedMatch;
    while ((embedMatch = embedRegex.exec(origBlockString)) !== null) {
        const blockRef = embedMatch[1]; // Extract the block reference from the embed
        if (blockRef) {
            let blockText = await resolveBlockRefs(blockRef); // Resolve the block reference
            // Replace the entire embed component with the resolved block text
            resolvedStr = resolvedStr.replace(embedMatch[0], blockText);
        }
    }
    // replace any trailing open (( (sometimes happens with block refs)
    resolvedStr = resolvedStr.replace("((", "");
    return resolvedStr;
}


async function batchSendBlocks(extensionAPI, graphEditToken, graphName, blockUID) {
    let query = `[:find (pull ?e [:block/string
                                :block/open
                                :block/heading
                                :block/text-align
                                :children/view-type
                                :block/children
                                :block/order
                                {:block/children ...}])
                :in $ ?uid
                :where 
                [?e :block/uid ?uid] ]`;
    const data = await window.roamAlphaAPI.q(query, blockUID)
    var body = {
        "action" : "batch-actions", 
        "actions": []
    }

    async function queryToBatchCreate(parentIndex, data, page) {
        for (let index = 0; index < data.length; index++) {
            const block = data[index];
            let newIndex;
            if (page!== undefined) {
                if (page=="today") {
                    parentIndex = roamAlphaAPI.util.dateToPageUid(new Date())
                } else {
                    parentIndex = page
                }
                newIndex = roamAlphaAPI.util.generateUID()
            } else {
                newIndex = roamAlphaAPI.util.generateUID()
            }
            
            const resolvedBlockRefs = await resolveBlockRefs(block['string']);

            let actionObject = {
                actionType:"create-block",
                parentUID:parentIndex,
                string: resolvedBlockRefs,
                uid:newIndex
            }
    
            if (block["open"] !== undefined) {
                actionObject["open"] = block["open"];
            }
            if (block["heading"] !== undefined) {
                actionObject["heading"] = block["heading"];
            }
            if (block["text-align"] !== undefined) {
                actionObject["textAlign"] = block["text-align"];
            }
            if (block["view-type"] !== undefined) {
                actionObject["childViewType"] = block["view-type"];
            }
            
            body.actions.push(createBlockAction(actionObject))
    
            if (block["children"] !== undefined) {
                await queryToBatchCreate(newIndex, block["children"])
            }
        }
        
    }

    try {
        if (extensionAPI.settings.get('parent-toggle')==true) {
            let parentBlock = {
                string:extensionAPI.settings.get('parent-text'),
                children: data[0]
            }
            data[0] = [parentBlock]
        }
        await queryToBatchCreate(-1, data[0], "today")
        batchActions(graphEditToken, body)
        
        showToast("Blocks sent to " + graphName, "SUCCESS");
    } catch (error) {
        showToast("Error: " + error, "DANGER");
    }
}

async function sendToGraph(extensionAPI, blockUID) {

    // set up the graph tokens
    const graphs = getGraphInfo(extensionAPI)
    let graphEditToken;
    let graphName;
    if (graphs.length === 0) {
        // console.log('The list is empty.');
        showToast("You haven't added any Graph API Tokens to Send-To-Graph.", "WARNING");
        return
      } else if (graphs.length === 1) {
        // console.log('The list only has one graph so just use that.');
        graphName = graphs[0].name;  
        graphEditToken = initializeGraph({
            token: graphs[0].editToken,
            graph: graphs[0].name,
        });
        await batchSendBlocks(extensionAPI, graphEditToken, graphName, blockUID)
      } else {
        const renderMyAlert = createOverlayRender("myAlertId", MyAlert);

        const onClose = () => {
            console.log("Block Send Canceled");
          };
          
        const onConfirm = (value) => {
            extensionAPI.settings.set("default-graph", value)
            graphName = value.name;
            // send the blocks to the selected graph
            graphEditToken = initializeGraph({
                token: value.editToken,
                graph: value.name,
            });
            
            batchSendBlocks(extensionAPI, graphEditToken, graphName, blockUID)
        };
          
        const options = getGraphInfo(extensionAPI);
        const defaultValue = getDefaultGraph(extensionAPI);
    
        renderMyAlert({ onClose, onConfirm, options, defaultValue });
         
      }
  
}

async function pullFromGraph(extensionAPI, blockUID) {
    
}


function extractAndSplit(inputString) {
    const match = inputString.match(/{{cross-graph-block:([^}]+)}}/);
    return match ? match[1].split(':') : null;
}

async function onload({extensionAPI}) {

    const panelConfig = {
        tabTitle: "Send to Graph",
        settings: [
            {id:     "graphTokens",
                name:   "API Tokens",
                action: {type:     "reactComponent",
                        component: graphTokenPanel(extensionAPI)}},
            {
                id: "parent-block",
                name: "Parent Block",
                description:
                    "In the destination graph nest the sent blocks under a parent block described here.",
                action: {
                    type: "reactComponent",
                    component: ParentBlockSetting(extensionAPI),
                },
            },
        ]
        };

  extensionAPI.settings.panel.create(panelConfig);

    // register the right click buttons
    roamAlphaAPI.ui.blockContextMenu.addCommand({
        label: "Send to Graph",
        callback: (e) => sendToGraph(extensionAPI, e['block-uid'])
    })
    extensionAPI.ui.commandPalette.addCommand({label: 'Send To Graph', 
               callback: () => {
                let block = window.roamAlphaAPI.ui.getFocusedBlock()
    
                if (block != null){
                    sendToGraph(extensionAPI, block['block-uid'])
                }
               },
               "disable-hotkey": false,
               // this is the default hotkey, and can be customized by the user. 
               "default-hotkey": "ctrl-shift-s"})
    

    extensionAPI.ui.commandPalette.addCommand({
        label: "Cross Graph Sync - Pull in changes",
        "disable-hotkey": false,
        callback: async () => {
            let query = `[:find (pull ?e [:block/uid :block/string])
                        :in $ ?search ?nots
                        :where 
                            [?e :block/string ?string]
                            [(clojure.string/includes? ?string ?search)]
                            (not
                            [?e :block/string ?string]
                            [(clojure.string/includes? ?string ?nots)]
                            )
                    ]`;
    
            let results = window.roamAlphaAPI.q(query,'{{cross-graph-block:', "``").flat();
            results.forEach(block => {
                let remote_block_info = extractAndSplit(block.string)
                let remoteGraph = remote_block_info[0]
                let remoteBlockUID = remote_block_info[1]
        
                let eid = `[:block/uid "${remoteBlockUID}"]`
                let graph = initializeGraph(graph_info);
                const pattern = "[:block/string]";
        
                pull(graph, pattern, eid)
                .then(result => {
                    // Handle the result
                    console.log(result?.[':block/string'] ?? "Fallback value");
                    let newBlockString = `${result[':block/string']}{{cross-graph-block:${remoteGraph}:${remoteBlockUID}}}`
                    window.roamAlphaAPI.updateBlock(
                    {"block": 
                        {"uid": block.uid,
                            "string": newBlockString}
                    })
                })
                .catch(error => {
                    // Handle any errors
                    console.error(error);
                });
    
            });
        },
    })
  console.log("load send-to-graph plugin");
}    


function onunload() {
    window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
        label: "Send to Graph",
      });
  console.log("unload send-to-graph plugin");
}

export default {
onload,
onunload
};
