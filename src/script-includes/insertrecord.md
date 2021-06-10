---
title: "insertRecord"
id: "insertrecord"
---

API Name: global.insertRecord

```js
function insertRecord(current){
    if (typeof current.number != 'undefined' && current.number)
      current.number = ""; // generate a new number
    else if (typeof current.u_number != 'undefined' && current.u_number)
      current.u_number = ""; // generate a new number

    var table = current.getTableName();
    var td = GlideTableDescriptor.get(table);
    var elements = td.getSchemaList();
    for (var i = 0, len = elements.size(); i < len; i++) {
      var ed = elements.get(i);
      var fieldType = ed.getInternalType();
      if (fieldType == "user_image") {
        var fieldName = ed.getName();
        current[fieldName] = undefined; // remove the existing
      }
    }
    return current.insert();
}
```