import { initializeGraph, q, pull, createBlock, batchActions } from '@roam-research/roam-api-sdk';
import graphTokenPanel from './components/graphTokens';
import { showToast } from './components/toast';
import MyAlert from './components/alerts';
import createOverlayRender from "roamjs-components/util/createOverlayRender";

async function getGraphInfo(extensionAPI) {
    return await extensionAPI.settings.get('graphInfo') || []
  }
async function getDefaultGraph(extensionAPI) {
    return await extensionAPI.settings.get('default-graph') || await getGraphInfo(extensionAPI)[0]
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

async function sendToGraph(extensionAPI, blockUID) {

    var body = {
        "action" : "batch-actions", 
        "actions": [
    
            ]
        }
    // set up the graph tokens
    const graphs = await getGraphInfo(extensionAPI)
    console.log("graphs", graphs)
    let graphReadToken; //do I really need this?
    let graphEditToken;
    let onConfirmFinished = new Promise((resolve, reject) => {});

    if (graphs.length === 0) {
        console.log('The list is empty.');
        showToast("You haven't added any Graph API Tokens to Send-To-Graph.", "WARNING");

        return
      } else if (graphs.length === 1) {
        console.log('The list only has one graph so just use that.');
        graphEditToken = initializeGraph({
            token: graphs[0].editToken,
            graph: graphs[0].name,
        });
      } else {
        console.log("there are more than 1 graph loaded");
        const renderMyAlert = await createOverlayRender("myAlertId", MyAlert);
    
        const onClose = () => {
            console.log("Overlay closed");
        };
    
        const onConfirm = (value) => {
            console.log("Selected value:", value);
            extensionAPI.settings.set("default-graph", value)
            graphEditToken = initializeGraph({
                token: graphs[value].editToken,
                graph: graphs[value].name,
            });
            // Resolve the Promise
            resolve();
        };
    
        const options = getGraphInfo(extensionAPI);
        const defaultValue = getDefaultGraph(extensionAPI);
    
        renderMyAlert({ onClose, onConfirm, options, defaultValue });
        console.log("after the alert")
    }
  
    function queryToBatchCreate(parentIndex, data, page) {
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
            
    
            let actionObject = {
                actionType:"create-block",
                parentUID:parentIndex,
                string:block['string'],
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
                queryToBatchCreate(newIndex, block["children"])
            }
        }
        
    }

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
    
    let r = await window.roamAlphaAPI.q(query,blockUID)           

    queryToBatchCreate(-1, r[0], "today")
    
    // Wait for the Promise to be resolved before calling batchActions
    await onConfirmFinished;
    console.log("we are confirmed")
    batchActions(graphEditToken, body);
 
}


async function onload({extensionAPI}) {

    const renderMyAlert = createOverlayRender("myAlertId", MyAlert);
    
        const onClose = () => {
            console.log("Overlay closed");
        };
    
        const onConfirm = (value) => {
            console.log("Selected value:", value);
            // extensionAPI.settings.set("default-graph", value)
            // graphEditToken = initializeGraph({
            //     token: graphs[value].editToken,
            //     graph: graphs[value].name,
            // });
            // Resolve the Promise
            resolve();
        };
    
        const options = getGraphInfo(extensionAPI);
        const defaultValue = getDefaultGraph(extensionAPI);
    
        renderMyAlert({ onClose, onConfirm, options, defaultValue });

    const panelConfig = {
        tabTitle: "Send to Graph",
        settings: [
            {id:     "graphTokens",
                name:   "API Tokens",
                action: {type:     "reactComponent",
                        component: graphTokenPanel(extensionAPI)}}
        ]
        };

  extensionAPI.settings.panel.create(panelConfig);

    // register the right click buttons
    roamAlphaAPI.ui.blockContextMenu.addCommand({
        label: "Send to Graph",
        callback: (e) => sendToGraph(extensionAPI, e['block-uid'])
    })
    
  console.log("load send-to-graph plugin");
}    

function onunload() {
  console.log("unload send-to-graph plugin");
}

export default {
onload,
onunload
};
