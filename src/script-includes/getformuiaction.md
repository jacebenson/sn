---
title: "getFormUIAction"
id: "getformuiaction"
---

API Name: global.getFormUIAction

```js
function getFormUIAction(tableName, formUI) {
    // If the user is looking for UI Actions in a Workspace context, then we need to use a different set of queries
    // than in the Standard form UI
    var nilTableString = "";
    var stringQueryPostfix = "";
    if (!formUI || formUI.trim() === "standard_ui") {
        nilTableString = "table=global^form_action=true^active=true";
        stringQueryPostfix = "^form_action=true^active=true";
    } else {
        nilTableString = "table=global^active=true^form_button_v2=true^ORform_menu_button_v2=true";
        stringQueryPostfix = "^active=true^form_button_v2=true^ORform_menu_button_v2=true";
    }

    if (GlideStringUtil.nil(tableName))
        return nilTableString;

    var currentAndParentTables = GlideDBObjectManager.get().getTables(tableName);
    var str = currentAndParentTables.toString();
    var tables = str.substring(1, str.length() - 1);
    tables += ", global";
    var stringQuery = "tableIN" + tables + stringQueryPostfix;
    return stringQuery;
}
```