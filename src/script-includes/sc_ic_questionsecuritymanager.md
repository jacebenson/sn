---
title: "sc_ic_QuestionSecurityManager"
id: "sc_ic_questionsecuritymanager"
---

API Name: global.sc_ic_QuestionSecurityManager

```js
var sc_ic_QuestionSecurityManager = Class.create();

sc_ic_QuestionSecurityManager.prototype = Object.extendsObject(sc_ic_SecurityManager, {
	
	/** Returns false. Subclasses should define when creation should be allowed */
	canCreate: function() {
		var item;
		var itemGr = this._gr[sc_ic.ITEM_STAGING].getRefRecord();
		if (this._gr[sc_ic.ITEM_STAGING])
			item = sc_ic_Factory.wrap(itemGr);
		else
			item = sc_ic_Factory.wrap(this._gr[sc_ic.SECTION][sc_ic.ITEM_STAGING].getRefRecord());
		if (!item.accessibleInDomain())
			return false;
		return gs.hasRole(sc_.CATALOG_ADMIN) || gs.hasRole(sc_ic.CATALOG_MANAGER) || gs.hasRole(sc_ic.CATALOG_EDITOR);
	},
	
	/** Returns false. Subclasses should define when reading should be allowed */
	canRead: function() {
		if (gs.hasRole(sc_.CATALOG_ADMIN))
			return true;
		
		return sc_ic_Factory.getSecurityManager(this._gr[sc_ic.ITEM_STAGING].getRefRecord()).canRead();
	},
	
	/** Returns false. Subclasses should define when updating should be allowed */
	canUpdate: function() {
		return sc_ic_Factory.getSecurityManager(this._gr[sc_ic.ITEM_STAGING].getRefRecord()).canUpdate();
	},
	
	/** Returns false. Subclasses should define when deleting should be allowed */
	canDelete: function() {
		return sc_ic_Factory.getSecurityManager(this._gr[sc_ic.ITEM_STAGING].getRefRecord()).canUpdate();
	},
	
    type: "sc_ic_QuestionSecurityManager"
});

```