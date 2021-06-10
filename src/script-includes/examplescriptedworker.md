---
title: "ExampleScriptedWorker"
id: "examplescriptedworker"
---

API Name: global.ExampleScriptedWorker

```js
var ExampleScriptedWorker = Class.create();

ExampleScriptedWorker.prototype = {
  initialize : function() {
  },
  
  process: function(startMsg) {
     worker.addMessage(startMsg);
  }
}
```