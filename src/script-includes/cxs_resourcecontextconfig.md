---
title: "cxs_ResourceContextConfig"
id: "cxs_resourcecontextconfig"
---

API Name: global.cxs_ResourceContextConfig

```js
var cxs_ResourceContextConfig = Class.create();
cxs_ResourceContextConfig.prototype = {
    initialize: function(gr) {
        this._gr = gr;
    },

    isDefault: function() {
        return this._gr.default_search;
    },

    setDefault: function(value) {
        this._gr.default_search = value;
    },

    makeDefault: function() {
        var siblingsGr = new GlideRecord("cxs_res_context_config");
        siblingsGr.addQuery("sys_id", "!=", this._gr.sys_id);
        siblingsGr.addQuery("cxs_context_config", this._gr.cxs_context_config);
        siblingsGr.addEncodedQuery("cxs_search_res_config.resource_type!=");
        siblingsGr.addQuery("default_search", true);
        siblingsGr.query();

        while (siblingsGr.next()) {
            siblingsGr.default_search = false;
            siblingsGr.setWorkflow(false);
            siblingsGr.update();
        }

        this._gr.default_config = true;

        gs.addInfoMessage(gs.getMessage("{0} is now the default search resource", this._gr.name));

        return true;
    },

    type: 'cxs_ResourceContextConfig'
};
```