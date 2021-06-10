---
title: "OnCallRotationRecalc"
id: "oncallrotationrecalc"
---

API Name: global.OnCallRotationRecalc

```js
var OnCallRotationRecalc = Class.create();

var beenHereAlready;


/**
 * Recompute the rotation schedules for the roster members.
 * 
 * @param GlideRecord cmn_rota_roster
 */
OnCallRotationRecalc.updateSchedules = function(cmn_rota_roster) {
   OnCallRotationRecalc.checkDuplicateOrders(cmn_rota_roster);
   
   // Recompute the rotation schedules for the roster members
   new OnCallRotation().computeRotationSchedules(cmn_rota_roster);

   // Only log this message one time as we might end up updating the schedules multiple times
   // due to changes in the member list
   if (!beenHereAlready) {
      gs.addInfoMessage(gs.getMessage("Rotation schedules for '{0} {1}' have been updated", [cmn_rota_roster.name, cmn_rota_roster.rota.name]));
      beenHereAlready = true;
   }
};

/**
 * Check for duplicate order numbers in more than one cmn_rota_roster record of the same rota.
 * 
 * @param GlideRecord cmn_rota_roster
 */
OnCallRotationRecalc.checkDuplicateOrders = function(cmn_rota_roster) {
   if (cmn_rota_roster.active) {
      var rosterGR = new GlideRecord("cmn_rota_roster");
      rosterGR.initialize();
      rosterGR.addActiveQuery();
      rosterGR.addQuery("rota", cmn_rota_roster.rota);
      rosterGR.query();
      while (rosterGR.next()) {
         if (rosterGR.sys_id != cmn_rota_roster.sys_id && rosterGR.order == cmn_rota_roster.order) {
            gs.addErrorMessage(gs.getMessage("There are duplicate roster orders for this rota"));
            return;
         }
      }
   }
};


OnCallRotationRecalc.prototype = {
   initialize : function() {
   },
   type: 'OnCallRotationRecalc'
};
```