---
title: "TableRotationUtil"
id: "tablerotationutil"
---

API Name: global.TableRotationUtil

```js
gs.include("PrototypeServer"); 

var TableRotationUtil = Class.create();

TableRotationUtil.prototype = {

   initialize : function() {
      this.tableRotationUtil = new SNC.TableRotationUtil();
   },

   synchronize : function() {
      this.tableRotationUtil.synchronize();
   },

   // Create an extension table for the given table
   create : function(tableName) {
      return this.tableRotationUtil.create(tableName);
   }, 

   // Create all extensions necessary for a table
   _createTables : function() {
      gs.log("TableRotationUtil._createTables has been deprecated");
   },

   // Create an rotation that extends a table
   _createRotation : function(tableName, parentName) {
      gs.log("TableRotationUtil._createRotation has been deprecated");
   },

   _setReference : function (ca) {
      gs.log("TableRotationUtil._setReference has been deprecated");
   },

   // Get all the extensions for the table
   _getExtensions : function (tableName) {
      gs.log("TableRotationUtil._getExtensions has been deprecated");
   },

   _getChildren : function(tableName) {
      gs.log("TableRotationUtil._getChildren has been deprecated");
   }, 

   _addParents : function(list) {
      gs.log("TableRotationUtil._addParents has been deprecated");
   },

   _getRotationSuffix : function() {
      gs.log("TableRotationUtil._getRotationSuffix has been deprecated");
   },
 
   // Build the rotation name which is the next larger sequence number
   _getRotationName : function(name) {
      gs.log("TableRotationUtil._getRotationName has been deprecated");
   },

   _getRotation : function(name) {
      gs.log("TableRotationUtil._getRotation has been deprecated");
   },

   _getMaxRotation : function(name) {
      gs.log("TableRotationUtil._getMaxRotation has been deprecated");
   },

   _z : function() {
      return "TableRotationUtil";
   }

};

```