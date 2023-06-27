import { initializeGraph, q, createBlock, batchActions } from '@roam-research/roam-api-sdk';

const panelConfig = {
  tabTitle: "Send to Graph",
  settings: [
      {id:     "graph-edit",
       name:   "Edit Token",
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

async function onload({extensionAPI}) {
  // set defaults if they dont' exist
  if (!extensionAPI.settings.get('data')) {
      await extensionAPI.settings.set('data', "01");
  }
  extensionAPI.settings.panel.create(panelConfig);

  const graph = initializeGraph({
    token: extensionAPI.settings.get('graph-edit'),
    graph: extensionAPI.settings.get('graph-name'),
  });
  // q(graph,
  //   "[:find (pull ?e [*]) :in $ ?namespace  :where [?e :node/title ?namespace]]",
  //   ["test"])
  // .then((r) => {
  //   console.log(r);
  // });
  let body = {
      "action" : "create-block",
      "location": {
          "parent-uid": "06-27-2023",
          "order": "last"
      },
      "block": {
          "string": "the elephant from the Paradise music video!! (to be moved)",
          "open": true,
          "heading": 3,
          "children-view-type": "numbered",
          "text-align": "right"
      }
  }
  // createBlock(graph, body)

  body = {
    "action" : "batch-actions", 
    "actions": [
        {
            "action": "create-block",
            "location": {
                "parent-uid": "06-27-2023",
                "order": "last"
            },
            "block": {
                "string": "First",
                "uid": -1
            }
        },
        {
            "action": "create-block",
            "location": {
                "parent-uid": "06-27-2023",
                "order": "last"
            },
            "block": {
                "string": "Third"
            }
        },
        {
            "action": "create-block",
            "location": {
                "parent-uid": -1,
                "order": "last"
            },
            "block": {
                "string": "Second",
                "uid": -2
            }
        },
    ]
}
  batchActions(graph, body)
  console.log("load example plugin");
}

for (let index = 1; index < array.length; index++) {
  const element = array[index];
  const depth = index * -1
  
}

function onunload() {
  console.log("unload example plugin");
}

export default {
onload,
onunload
};
