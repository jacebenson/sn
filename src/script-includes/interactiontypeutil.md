---
title: "InteractionTypeUtil"
id: "interactiontypeutil"
---

API Name: global.InteractionTypeUtil

```js
var InteractionTypeUtil = Class.create();
InteractionTypeUtil.prototype = {
    initialize: function() {},

    getConversationInteractionTypes: function() {
        var types = ["chat"];
        if (new GlidePluginManager().isActive("com.glide.cs.custom.adapter"))
            types.push("messaging");
        return types;
    },

    type: 'InteractionTypeUtil'
};
```