import React, { useState } from 'react';
import { Alert, Toaster, Intent, Button, MenuItem } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";

const AppToaster = Toaster.create();

export const showToast = () => {
  AppToaster.show({ message: "You haven't added any Graph API Tokens to Send-To-Graph.", intent: Intent.WARNING });
};

export const Alerts = ({ graphInfo, onConfirm }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedGraph, setSelectedGraph] = useState(null);
    console.log(graphInfo)
    const renderGraph = (graph, { handleClick }) => (
      <MenuItem key={graph.name} onClick={handleClick} text={graph.name} />
    );
    
    return (
      <Alert
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => onConfirm(selectedGraph)}
      >
        <Select
          items={graphInfo}
          itemRenderer={renderGraph}
          onItemSelect={(graph) => setSelectedGraph(graph.name)}
          noResults={<MenuItem disabled={true} text="No results." />}
        >
          <Button text={selectedGraph ? selectedGraph.name : "Select a graph"} rightIcon="double-caret-vertical" />
        </Select>
      </Alert>
    );
  };