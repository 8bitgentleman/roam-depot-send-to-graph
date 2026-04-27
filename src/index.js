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
    // parentUID or pageTitle,
    // string,
    // uid,
    // open,
    // heading,
    // textAlign,
    // childViewType,
    // order="last"
    const location = {};

    // Support both parent-uid (for blocks) and page-title (for pages/daily notes)
    if (actionObject.pageTitle !== undefined) {
        location["page-title"] = actionObject.pageTitle;
    } else if (actionObject.parentUID !== undefined) {
        location["parent-uid"] = actionObject.parentUID;
    }

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
async function resolveBlockRefs(origBlockString, unresolvedUids = []) {
    const blockRegex = /(?<=\(\()\b(.*?)\b(?=\)\))(?![^{]*}})/g;
    const embedRegex = /{{\[{0,2}embed.*?(\(\(.*?\)\)).*?}}/g;

    let resolvedStr = origBlockString;

    // Resolve block references
    let blockMatch;
    while ((blockMatch = blockRegex.exec(origBlockString)) !== null) {
        const blockUid = blockMatch[0];
        if (blockUid) {
            // Pull the block data, checking for null response
            const blockData = await window.roamAlphaAPI.pull("[:block/string]", `[:block/uid "${blockUid}"]`);
            if (blockData && blockData[':block/string']) {
                let blockText = blockData[':block/string'];
                // Recursively resolve any block references in the fetched block text
                const result = await resolveBlockRefs(blockText, unresolvedUids);
                blockText = result.resolvedString;
                // Replace the original block reference with the resolved block text
                resolvedStr = resolvedStr.replace(`((${blockUid}))`, blockText);
            } else {
                // If block doesn't exist, leave the reference as-is and track it
                console.warn(`Block reference ((${blockUid})) could not be resolved - block may not exist`);
                unresolvedUids.push(blockUid);
            }
        }
    }

    // Resolve block embeds
    let embedMatch;
    while ((embedMatch = embedRegex.exec(origBlockString)) !== null) {
        const blockRef = embedMatch[1]; // Extract the block reference from the embed
        if (blockRef) {
            const result = await resolveBlockRefs(blockRef, unresolvedUids); // Resolve the block reference
            // Replace the entire embed component with the resolved block text
            resolvedStr = resolvedStr.replace(embedMatch[0], result.resolvedString);
        }
    }
    // replace any trailing open (( (sometimes happens with block refs)
    resolvedStr = resolvedStr.replace("((", "");
    return { resolvedString: resolvedStr, unresolvedUids };
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

    // Track all unresolved block references across all blocks
    const allUnresolvedUids = [];

    async function queryToBatchCreate(parentIndex, data, page) {
        for (let index = 0; index < data.length; index++) {
            const block = data[index];
            let newIndex;
            let usePageTitle = false;
            let pageTitle = null;

            if (page !== undefined) {
                if (page == "today") {
                    // Use Backend API's daily-note-page format for reliability
                    const today = new Date();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const year = today.getFullYear();
                    pageTitle = { "daily-note-page": `${month}-${day}-${year}` };
                    usePageTitle = true;
                } else {
                    parentIndex = page;
                }
                newIndex = roamAlphaAPI.util.generateUID();
            } else {
                newIndex = roamAlphaAPI.util.generateUID();
            }

            const resolveResult = await resolveBlockRefs(block['string'], []);
            const resolvedBlockRefs = resolveResult.resolvedString;
            // Collect any unresolved UIDs from this block
            if (resolveResult.unresolvedUids.length > 0) {
                allUnresolvedUids.push(...resolveResult.unresolvedUids);
            }

            let actionObject = {
                actionType: "create-block",
                string: resolvedBlockRefs,
                uid: newIndex
            };

            // Use page-title for top-level blocks targeting daily pages, parent-uid for nested blocks
            if (usePageTitle) {
                actionObject.pageTitle = pageTitle;
            } else {
                actionObject.parentUID = parentIndex;
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
        const batch = await batchActions(graphEditToken, body)

        // Check if batch action was successful
        if (batch && batch.error) {
            const failureInfo = batch['num-actions-successfully-transacted-before-failure'];
            if (failureInfo !== undefined) {
                console.error(`Batch action failed after ${failureInfo} successful actions`, batch);
                showToast(`Error: Failed after ${failureInfo} blocks. ${batch.error}`, "DANGER");
            } else {
                console.error('Batch action error:', batch);
                showToast(`Error: ${batch.error}`, "DANGER");
            }
        } else {
            showToast("Blocks sent to " + graphName, "SUCCESS");

            // Warn user about unresolved block references if any exist
            if (allUnresolvedUids.length > 0) {
                const uniqueUids = [...new Set(allUnresolvedUids)]; // Remove duplicates
                const uidList = uniqueUids.slice(0, 3).join(', '); // Show first 3
                const moreCount = uniqueUids.length > 3 ? ` and ${uniqueUids.length - 3} more` : '';
                showToast(`Warning: ${uniqueUids.length} block reference(s) could not be resolved: ((${uidList}))${moreCount}. Blocks were sent with unresolved references.`, "WARNING");
            }
        }
    } catch (error) {
        console.error('Error sending blocks:', error);
        // Provide more specific error messages based on error type
        let errorMessage = "Error: " + error.message || error;
        if (error.message && error.message.includes("Parent entity doesn't exist")) {
            errorMessage = "Error: Target page doesn't exist. Try opening the destination graph first.";
        } else if (error.message && error.message.includes("Cannot read properties of null")) {
            errorMessage = "Error: Block reference couldn't be resolved. Some referenced blocks may not exist.";
        }
        showToast(errorMessage, "DANGER");
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
          
        const onConfirm = async (value) => {
            extensionAPI.settings.set("default-graph", value)
            graphName = value.name;
            // send the blocks to the selected graph
            graphEditToken = initializeGraph({
                token: value.editToken,
                graph: value.name,
            });

            await batchSendBlocks(extensionAPI, graphEditToken, graphName, blockUID)
        };
          
        const options = getGraphInfo(extensionAPI);
        const defaultValue = getDefaultGraph(extensionAPI);
    
        renderMyAlert({ onClose, onConfirm, options, defaultValue });
         
      }
  
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
