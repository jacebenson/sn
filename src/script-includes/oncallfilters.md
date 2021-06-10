---
title: "OnCallFilters"
id: "oncallfilters"
---

API Name: global.OnCallFilters

```js
gs.include("PrototypeServer");

var OnCallFilters=Class.create();

OnCallFilters.prototype = {

   initialize : function() {
      this.debug = 'false';
   },

   setDebug: function(value) {
      this.debug = value;
   },

   // Roster lookup from Roster Schedule Entry form
   getRosterByGroup : function() {
      if (!current.group.nil()) 
         answer = "rota.group=" + current.group;
      return answer;
   },

   type: 'OnCallFilters'
};

```