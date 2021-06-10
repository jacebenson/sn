---
title: "TableDescriptor"
id: "tabledescriptor"
---

API Name: global.TableDescriptor

```js
gs.include("PrototypeServer");

var TableDescriptor = Class.create();

TableDescriptor.prototype = {

   initialize : function(name, label) {
      this.tableDescriptor = new SNC.TableRotationBootstrap(name, label);
      gs.log("This table rotation descriptor API has been deprecated");
   },

   setExtends : function(name) {
      this.tableDescriptor.setExtends(name);
   },

   setAttributes : function(attrs) {
      this.tableDescriptor.setAttributes(attrs);
   },

   setRoles : function(td) {
      this.tableDescriptor.setRoles(td);
   },

   create: function() {
      this.tableDescriptor.create();
   },

   copyIndexes: function(source, target) {
      this.tableDescriptor.copyIndexes(source, target);
   },

   addField: function(fieldDescriptor) {
      this.tableDescriptor.addField(fieldDescriptor);
   },

   // Copy the attributes from current to new table
   copyAttributes : function(td) {
      this.tableDescriptor.copyAttributes(td);
   },

   removeAttr: function(attrs, attr) {
      return this.tableDescriptor.removeAttr(attrs, attr);
   },

   // Copy the fields from current to new table
   setFields : function(tblGr) {
      this.tableDescriptor.setFields(tblGr);
   },

   // Get all the details for a field in the current table
   _processField : function (fldObj, targetTable) {
      gs.log("TableDescriptor._processField has been deprecated");
   },

   // Ignore the sys_ fields that are created automatically
   _ignoreField : function (fieldName) {
      gs.log("TableDescriptor._ignoreField has been deprecated");
   },
	

   _setReference : function (ca) {
      gs.log("TableDescriptor._setReference has been deprecated");
   },

   _z : function() {
      return "TableDescriptor";
   }

};
```