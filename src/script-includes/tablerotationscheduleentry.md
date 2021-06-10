---
title: "TableRotationScheduleEntry"
id: "tablerotationscheduleentry"
---

API Name: global.TableRotationScheduleEntry

```js
var TableRotationScheduleEntry = Class.create();

TableRotationScheduleEntry.prototype = {

   initialize : function(rotation, tableName) {
      this.tableRotationScheduleEntry = new SNC.TableRotationScheduleEntry(rotation, tableName);
   },

   _init: function() {
      gs.log("TableRotationScheduleEntry._init in TableRotationScheduleEntry has been deprecated");
   },
  
   getTable: function() {
      return this.tableRotationScheduleEntry.getTable();
   },

   getRotationID: function() {
      return this.tableRotationScheduleEntry.getRotationID();
   },

   getStartTime: function() {
      return this.tableRotationScheduleEntry.getStartTime();
   },

   getNumericStartTime: function() {
      return this.tableRotationScheduleEntry.getNumericStartTime();
   },

   getNumericEndTime: function() {
      return this.tableRotationScheduleEntry.getNumericEndTime();
   },

   setEndNumericValue: function(endTime) {
      this.tableRotationScheduleEntry.setEndNumericValue(endTime);
   },

   setStartNumericValue: function(startTime) {
      this.tableRotationScheduleEntry.setStartNumericValue(startTime);
   },

   update: function() {
      this.tableRotationScheduleEntry.update();
   },

   getEndTime: function() {
      return this.tableRotationScheduleEntry.getEndTime();
   },

   getType : function() {
      return "TableRotationScheduleEntry";
   }

};
```