---
title: "FieldDescriptor"
id: "fielddescriptor"
---

API Name: global.FieldDescriptor

```js
gs.include("PrototypeServer");

var FieldDescriptor = Class.create();

FieldDescriptor.prototype = {

   initialize : function(name) {
      this.fieldDescriptor = new SNC.TableRotationField(name);
   },

   _setIgnoreList : function() {
      gs.log("FieldDescriptor._setIgnoreList has been deprecated");
   },

   _setFieldNames : function() {
      gs.log("FieldDescriptor._setFieldNames has been deprecated");
   },

   // A sys_dictionary record that provides the prototype for a new field
   setPrototype : function(r) {
      this.fieldDescriptor.setPrototype(r);
   },

   setChoiceTable : function(tableName) {
      this.fieldDescriptor.setChoiceTable(tableName);
   },

   setChoiceField : function(fieldName) {
      this.fieldDescriptor.setChoiceField(fieldName);
   },

   setReferenceTable : function(tableName) {
      this.fieldDescriptor.setReferenceTable(tableName);
   },

   setField : function(name, value) {
      this.fieldDescriptor.setField(name, value);
   },

   getField: function(name) {
      return this.fieldDescriptor.getField(name);
   },

   getName : function() {
      return this.fieldDescriptor.getName();
   },

   toXML: function(doc) {
      this.fieldDescriptor.toXML(doc);
   },

   _ignoreValue : function(fn, fv) {
      gs.log("FieldDescriptor._setIgnoreList has been deprecated");
   },

   _z : function() {
      return "FieldDescriptor";
   }

};

```