---
title: "TableRotation"
id: "tablerotation"
---

API Name: global.TableRotation

```js
var TableRotation = Class.create();

TableRotation.prototype = {

   initialize : function(tableName) {
      this.tableRotation = new SNC.TableRotationSynchronizer(tableName);
   },

   _init: function(tableName) {
      gs.log("TableRotation._init has been deprecated");
   },

   synchronize : function() {
      this.tableRotation.synchronize();
   },

   getDefinition : function() {
      return this.tableRotation.getDefinition();
   },

   getBase : function() {
      return this.tableRotation.getBase();
   },

   getDuration : function() {
      return this.tableRotation.getDuration();
   },

   getCurrentRotations : function() {
      return this.tableRotation.getCurrentRotations();
   },

   _getDirectClassExtensions : function() {
      gs.log("TableRotation._getDirectClassExtensions has been deprecated");
   },

   _synchronizeClassExtension : function(classExtensionName) {
      gs.log("TableRotation._synchronizeClassExtension has been deprecated");
   },

   _syncDefinitions : function(classExtensionName, exist) {
      gs.log("TableRotation._synchDefinitions has been deprecated");
   },

   _createRotation : function(tableName, parentName, exist) {
      gs.log("TableRotation._createRotation has been deprecated");
   },

   _addScheduleEntry : function(name) {
      gs.log("TableRotation._addScheduleEntry has been deprecated");
   },

   _createScheduleEntryNow : function(name) {
      gs.log("TableRotation._createScheduleEntryNow has been deprecated");
   },

   _getRotationName : function(name, suffix) {
      gs.log("TableRotation._getRotationName has been deprecated");
   },

   _generateSuffix : function(rotation) {
      gs.log("TableRotation._generateSuffix has been deprecated");
   },

   getExtensionsWanted : function() {
      return this.tableRotation.getExtensionsWanted();
   },

   _getExtensionsDefined: function(name) {
      gs.log("TableRotation._getExtensionsDefined has been deprecated");
   },

   _getNextStartTime : function() {
      gs.log("TableRotation._getNextStartTime has been deprecated");
   },

   isExtension : function() {
      return this.tableRotation.isExtension();
   },

   getID : function() {
      return this.tableRotation.getID();
   },

   getName : function() {
      return this.tableRotation.getName();
   },

   isValid : function() {
      return this.tableRotation.isValid();
   },

   getType : function() {
      return "TableRotation";
   }

};
```