import { initializeGraph, q, pull, createBlock, batchActions } from '@roam-research/roam-api-sdk';

const panelConfig = {
    tabTitle: "Send to Graph",
    settings: [
        {id:     "graph-edit",
         name:   "Edit Token",
         action: {type:        "input",
                  placeholder: "placeholder",
                  onChange:    (evt) => { console.log("Input Changed!", evt); }}},
      {id:     "graph-read",
      name:   "Read Token",
      action: {type:        "input",
                  placeholder: "placeholder",
                  onChange:    (evt) => { console.log("Input Changed!", evt); }}},
      {id:     "graph-name",
        name:   "Graph Name",
        action: {type:        "input",
                  placeholder: "placeholder",
                  onChange:    (evt) => { console.log("Input Changed!", evt); }}},
    ]
  };



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

async function sendToGraph(graphReadToken, graphEditToken, blockUID) {
    var body = {
        "action" : "batch-actions", 
        "actions": [
    
            ]
        }
    
    function queryToBatchCreate(parentIndex, data, page) {
        for (let index = 0; index < data.length; index++) {
            const block = data[index];
            // construct the actionObject
            let newIndex;
            if (page!== undefined) {
                console.log('first page')
                if (page=="today") {
                    parentIndex = roamAlphaAPI.util.dateToPageUid(new Date())
                } else {
                    parentIndex = page
                }
                newIndex = roamAlphaAPI.util.generateUID()
            } else {
                newIndex = roamAlphaAPI.util.generateUID()
                console.log(parentIndex,newIndex)
            }
            
    
            let actionObject = {
                actionType:"create-block",
                parentUID:parentIndex,
                string:block[':block/string'],
                uid:newIndex
            }
    
            if (block[":block/open"] !== undefined) {
                actionObject["open"] = block[":block/open"];
            }
            if (block[":block/heading"] !== undefined) {
                actionObject["heading"] = block[":block/heading"];
            }
            if (block[":block/text-align"] !== undefined) {
                actionObject["textAlign"] = block[":block/text-align"];
            }
            if (block[":children/view-type"] !== undefined) {
                actionObject["childViewType"] = block[":children/view-type"];
            }
            
            body.actions.push(createBlockAction(actionObject))
    
            if (block[":block/children"] !== undefined) {
                queryToBatchCreate(newIndex, block[":block/children"])
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

  q(graphReadToken, query, [blockUID])
  .then((r) => {
    queryToBatchCreate(-1, r[0], "today")
    console.log(body);
    console.log(r[0])
    batchActions(graphEditToken, body)
  });
}

async function onload({extensionAPI}) {
  extensionAPI.settings.panel.create(panelConfig);

  //currently only one graph supported
  const graphReadToken = initializeGraph({
    token: extensionAPI.settings.get('graph-read'),
    graph: extensionAPI.settings.get('graph-name'),
  });
  const graphEditToken = initializeGraph({
    token: extensionAPI.settings.get('graph-edit'),
    graph: extensionAPI.settings.get('graph-name'),
  });

    // register the right click buttons
    roamAlphaAPI.ui.blockContextMenu.addCommand({
        label: "Send to Graph",
        callback: (e) => sendToGraph(graphReadToken, graphEditToken, e['block-uid'])
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
