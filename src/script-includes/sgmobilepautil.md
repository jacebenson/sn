---
title: "SGMobilePAUtil"
id: "sgmobilepautil"
---

API Name: global.SGMobilePAUtil

```js
var SGMobilePAUtil = Class.create();
SGMobilePAUtil.prototype = {
    initialize: function() {},

    selectLatestScoreWidget: function() {
        if (current.type == "PA")
            return "type=score^visualization=latest";

        else
            return "";

    },
	
    type: 'SGMobilePAUtil'
};
```