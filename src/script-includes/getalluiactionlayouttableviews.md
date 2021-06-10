---
title: "getAllUIActionLayoutTableViews"
id: "getalluiactionlayouttableviews"
---

API Name: global.getAllUIActionLayoutTableViews

```js
function getAllUIActionLayoutTableViews(tableName) {
    var views = [];
    var viewRelatedTables = ['sys_ui_form', 'sys_ui_section'];
    viewRelatedTables.forEach(addToViews);

    function addToViews(value) {
        var gr = new GlideRecord(value);
        gr.addEncodedQuery("view.userISEMPTY^view.groupISEMPTY");
        gr.addQuery('name', tableName);
        gr.query();
        while (gr.next()) {
            var view = gr.getValue('view');
            if (views.indexOf(view) === -1)
                views.push(view);
        }
    }
    return views;
}
```