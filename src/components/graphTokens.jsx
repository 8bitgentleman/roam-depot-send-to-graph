import { Button, InputGroup, Divider, ButtonGroup, Icon } from "@blueprintjs/core";
import React, { useState, useEffect } from "react";
import { IconNames } from '@blueprintjs/icons';

const graphTokenPanel = (extensionAPI) => () => {
    const [graphName, setGraphName] = useState("");
    const [graphEditToken, setGraphEditToken] = useState("");
    const [graphInfo, setGraphInfo] = useState([]);
    const [selected, setSelected] = useState('askToUpdate');

    const handleSelect = (option) => {
        setSelected(option);
    };

    useEffect(() => {
        const fetchGraphInfo = async () => {
          const initialGraphInfo = await extensionAPI.settings.get("graphInfo");
          setGraphInfo(initialGraphInfo || []);
        };
      
        fetchGraphInfo();
      }, []);


    const addGraph = (newGraph) => {
        setGraphInfo((prevGraphInfo) => {
          // Check if a graph with the same name already exists
          const graphExists = prevGraphInfo.some(graph => graph.name === newGraph.name);
      
          // If it doesn't exist, add the new graph
          if (!graphExists) {
            // update extensionAPI
            extensionAPI.settings.set("graphInfo", [...prevGraphInfo, newGraph]);
            return [...prevGraphInfo, newGraph];
          }
      
          // If it does exist, return the previous state
          extensionAPI.settings.set("graphInfo", prevGraphInfo);

          return prevGraphInfo;
        });
      };

      const deleteGraph = (graphName) => {
        // remove a graph from state and settings
        setGraphInfo((prevGraphInfo) => {
          const newGraphInfo = prevGraphInfo.filter(graph => graph.name !== graphName);
          extensionAPI.settings.set("graphInfo", newGraphInfo);

          return newGraphInfo;
        });
      };

    return (
        <ul style={{ display: "flex", flexDirection: "column" }}>
            <div >
                {graphInfo.map((graph) => (
                <div key={graph.name}>
                    {graph.name}
                    <Button
                    icon="trash"
                    minimal
                    onClick={() => deleteGraph(graph.name)}
                    />
                </div>
                ))}
            </div>
            <Divider></Divider>
            <ul style={{paddingLeft:"0"}}>
                <li class="input-group">
                    <InputGroup placeholder="New Graph Name" id="name" value={graphName} onChange={(e) => setGraphName(e.target.value)} />
                </li>
                <li class="input-group">
                    <InputGroup placeholder="New Graph Edit Access Token" id="edit" value={graphEditToken} onChange={(e) => setGraphEditToken(e.target.value)} />
                </li>
                <li className="input-group" style={{ marginTop:"8px", display: "flex", justifyContent: "center" }}>
                    <h3>Sync Block Settings</h3>
                </li>
                <li class="input-group sync-style">
                    <ButtonGroup minimal={true}>
                      <Button
                          active={selected === 'dontUpdate'}
                          onClick={() => handleSelect('dontUpdate')}
                          intent={selected === 'dontUpdate' ? 'primary' : 'none'}
                          className="vertical-button"
                      >
                          <Icon icon={IconNames.CROSS} />
                          <div className="button-label">Don't</div>
                          <div className="button-label">Update</div>
                      </Button>
                      <Button
                          active={selected === 'askToUpdate'}
                          onClick={() => handleSelect('askToUpdate')}
                          intent={selected === 'askToUpdate' ? 'primary' : 'none'}
                          className="vertical-button"
                      >
                          <Icon icon={IconNames.IMPORT} />
                          <div className="button-label">Manual</div>
                          <div className="button-label">Update</div>
                      </Button>
                      <Button
                          active={selected === 'updateAuto'}
                          onClick={() => handleSelect('updateAuto')}
                          intent={selected === 'updateAuto' ? 'primary' : 'none'}
                          className="vertical-button"
                      >
                        <Icon icon={IconNames.REFRESH} />
                        <div className="button-label">Automatic</div>
                        <div className="button-label">Update</div>
                    </Button>
                  </ButtonGroup>
                </li>
                <li className="input-group" style={{ marginTop:"8px", display: "flex", justifyContent: "center" }}>
                  <Button
                      icon="plus"
                      minimal
                      onClick={() => {
                          let newGraph = {
                          name: graphName,
                          editToken: graphEditToken,
                          };
                          addGraph(newGraph);
                          // Reset the input fields
                          setGraphName("");
                          setGraphEditToken("");
                      }}
                      />
                </li>
            </ul>
        </ul>
    );
}
export default graphTokenPanel;