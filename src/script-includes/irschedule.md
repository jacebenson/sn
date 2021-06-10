---
title: "IRSchedule"
id: "irschedule"
---

API Name: global.IRSchedule

```js
var IRSchedule = Class.create();

IRSchedule.prototype = {
  initialize : function() {
  },

  schedule : function(eventName, table, email) {
   if (!gs.hasRole('admin') && !gs.hasRole('ts_admin'))
       return;

    if (eventName == 'indexAll' || eventName == 'createIndex')
       GlideTextIndexEvent().indexAll(table, email);
    else if (eventName == 'textIndexCreate')
       GlideTextIndexEvent().textIndexCreate(table, email);
	else if (eventName == 'upgradeBerlin')
       GlideTextIndexEvent().upgradeBerlin(email);
	else if (eventName == 'upgradeCalgary')
       GlideTextIndexEvent().upgradeCalgary(email);
	else if (eventName == 'build_synonym_mapping'){
       GlideTextIndexEvent().buildSynonymMapping();
	   gs.addInfoMessage(gs.getMessage('Publishing of dictionary has been scheduled'));
	}
	else if (eventName == 'build_doc_freq')
	    GlideTextIndexEvent().buildDocFreq(table, email);
	else if (eventName == 'activateIndexGroup')
	    GlideTextIndexEvent().activateIndexGroup(table, email);
	else if (eventName == 'upgradeToV4')
		GlideTextIndexEvent().upgradeToV4(table, email);
	else if (eventName == 'migrate_table')
		GlideTextIndexEvent().migrateTable(table, email);
  },

  isPublic: function() {
    return false;
  }
};
```