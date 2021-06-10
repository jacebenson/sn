---
title: "ScriptedRESTAPINamespaceCreator"
id: "scriptedrestapinamespacecreator"
---

API Name: global.ScriptedRESTAPINamespaceCreator

```js
var ScriptedRESTAPINamespaceCreator = Class.create();
        ScriptedRESTAPINamespaceCreator.prototype = {
            initialize: function() {
            },
            getNamespace:function() {
                if(gs.isCurrentApplicationInGlobalScope()) {
                    if(gs.getProperty('glide.appcreator.company.code')) {
                        return gs.getProperty('glide.appcreator.company.code');
                    } else {
                        return  gs.hasRole('maint') ? 'now' : 'global';
                    }
                } else {
                    return gs.getCurrentApplicationScope();
                }
            },
            type:'ScriptedRESTAPINamespaceCreator'
};
```