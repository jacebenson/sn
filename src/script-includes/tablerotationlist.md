---
title: "TableRotationList"
id: "tablerotationlist"
---

API Name: global.TableRotationList

```js
gs.include("PrototypeServer"); 

var TableRotationList = Class.create();

TableRotationList.prototype = {

   initialize : function() {
      this.tableRotationList = new SNC.TableRotationList();
   },

   _initList: function() {
      gs.log("TableRotationList._initList has been deprecated");
   },

   getList : function() {
      return this.tableRotationList.getList();
   },

   _z : function() {
      return "TableRotation";
   }

};
```