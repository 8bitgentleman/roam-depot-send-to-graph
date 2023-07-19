import React, { useState, useEffect } from 'react';
import { FormGroup, InputGroup, Switch } from "@blueprintjs/core";

const SETTING_NAME_TOGGLE = 'toggle';
const SETTING_NAME_TEXT = 'text';

const ParentBlockSetting = (extensionAPI) => {
    return () => {
        const [toggle, setToggle] = useState(extensionAPI.settings.get(SETTING_NAME_TOGGLE) || false);
        const [text, setText] = useState(extensionAPI.settings.get(SETTING_NAME_TEXT) || '');

        useEffect(() => {
            extensionAPI.settings.set(SETTING_NAME_TOGGLE, toggle);
        }, [toggle, extensionAPI]);

        useEffect(() => {
            extensionAPI.settings.set(SETTING_NAME_TEXT, text);
        }, [text, extensionAPI]);

        const handleToggle = () => {
            setToggle(!toggle);
        }

        const handleTextChange = (event) => {
            setText(event.target.value);
        }

        return (
            <div>
                <Switch checked={toggle} label="Toggle" onChange={handleToggle} />
                <FormGroup
                    label="Parent Block Text"
                    labelFor="text-input"
                >
                    <InputGroup 
                        id="text-input" 
                        disabled={!toggle} 
                        value={text} 
                        onChange={handleTextChange} 
                        fill={false}
                        style={{width: '200px', opacity: toggle ? 1 : 0.5}} // Adjust width as needed
                    />
                </FormGroup>
            </div>
        );
    }
}

export default ParentBlockSetting;