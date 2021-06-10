---
title: "ProcessGuide"
id: "processguide"
---

API Name: global.ProcessGuide

```js
gs.include("PrototypeServer");

var ProcessGuide = Class.create();

ProcessGuide.prototype = {
    initialize : function() {
		
    },

    getReferenceQual : function() {
        var answer = 'process_guide=' + current.sys_id;
        return answer;
    }
};

```