---
title: "Utils"
id: "utils"
---

API Name: sn_g_app_creator.Utils

```js

var Utils = Class.create();
Utils.prototype = {
  initialize: function() {},
  useLegacyAppCreator: function(/*boolean*/ useLegacy) {
    gs.setProperty("sn_g_app_creator.use.legacy.appcreator", !!useLegacy);
  },
  useAdditionalFieldTypes: function(/*String[]*/ types) {
    function validateType(type) {
      var gr = new GlideRecord("sys_glide_object");
      gr.addQuery("name", type);
      gr.addQuery("visible", true);
      gr.query();
      if (!gr.hasNext()) {
        gs.error("Field type: " + type + " does not exist");
        return false;
      }

      return true;
    }

    function validateTypes(types) {
      if (!Array.isArray(types)) {
        gs.error("Field types must be an Array.");
        return false;
      }

      return types.every(function(type) {
        if (typeof type !== "string") {
          gs.error("Each field type must be a string");
          return false;
        }

        return validateType(type);
      });
    }

    if (!validateTypes(types)) return false;

    gs.setProperty("sn_g_app_creator.field_types", types.join(","));
    return true;
  },
  type: "Utils"
};
    
```