import { Button, InputGroup, Divider } from "@blueprintjs/core";
import React, { useState, useEffect } from "react";

const graphTokenPanel = (extensionAPI) => () => {
    const [graphName, setGraphName] = useState("");
    const [graphEditToken, setGraphEditToken] = useState("");
    const [graphInfo, setGraphInfo] = useState([]);

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
            </ul>
        </ul>
    );
}
export default graphTokenPanel;