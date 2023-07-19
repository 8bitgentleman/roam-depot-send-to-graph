A Roam Research extension to send blocks from one graph to another. The destination graph does not need to be open.
This is a one-way push. The blocks are added to the new graph as if you had created them manually yourself.

## Features
- Send blocks to another graph with a simple right-click command or via hotkey.
- Configure multiple graphs to send blocks to.
- Option to nest sent blocks under a parent block (for example an _#inbox_ tag) in the destination graph.

## Setup 
This extension uses the new Roam backend API to allow sending of blocks to graphs that you do not have open.
Note: only the creator of a graph can create new API tokens. 

1. In your destination graph go to the Graph Settings page and select `New API Token`
    - <img src="https://github.com/8bitgentleman/roam-depot-send-to-graph/raw/main/assets/api-1.png" max-width="400"></img>
2. Name the token however you want but make sure to set the Access Scope to `Edit Access`. This gives the extention edit permissions to the graph. 
    - Note: When sending blocks I _ONLY_ add to the destination graph. There is no code to modify or delete _ANYTHING_.
    - <img src="https://github.com/8bitgentleman/roam-depot-send-to-graph/raw/main/assets/api-2.png" max-width="400"></img>
3. Select Create to generate your unique graph API token. Make sure to save the generated token before navigating away as it is not possible to see the token again once you have navigated away.
4. Open up the Source Graph and navigate to the Send To Graph settings page.
5. Add the Graph name and Edit Access token for the destination graph to the settings panel and hit the plus symbol. If either of these is incorrect in any way blocks you attempt to send will not go through. You can add as many graphs as you like.
    - <img src="https://github.com/8bitgentleman/roam-depot-send-to-graph/raw/main/assets/api-3.png" max-width="400"></img>


## Usage
There are 2 ways of using the Send-To-Graph extension:
1. Right-click on a block and select "Send to Graph". If you have multiple graphs configured, you will be asked to select the destination graph.
2. Alternatively, assign a hotkey via the settings panel to send the currently focused block to another graph.

## Example 

<video height="400" controls>
  <source src="https://github.com/8bitgentleman/roam-depot-send-to-graph/raw/main/assets/example.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

<!-- [![image](https://github.com/8bitgentleman/roam-depot-send-to-graph/assets/4028391/d6f7357f-1cc1-4f5f-9a49-16501b3e03eb)](https://github.com/8bitgentleman/roam-depot-send-to-graph/assets/4028391/d6f7357f-1cc1-4f5f-9a49-16501b3e03eb) -->


