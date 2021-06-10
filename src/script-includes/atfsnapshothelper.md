---
title: "ATFSnapshotHelper"
id: "atfsnapshothelper"
---

API Name: global.ATFSnapshotHelper

```js
var ATFSnapshotHelper = Class.create();
ATFSnapshotHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	process: function() {
		var name = this.getParameter('sysparm_name');
		if (name == 'getComponentsFromSnapshot')
			return JSON.stringify(this.getComponentsFromSnapshot(this.getParameter('sysparm_test_id'),
				this.getParameter('sysparm_step_order'), this.getParameter('sysparm_methods')));
		if (name == 'findSnapshot')
			return JSON.stringify(this.findSnapshot(this.getParameter('sysparm_test_id'),
			 this.getParameter('sysparm_step_order')));
	},

	/** Given a test sys_id and step order, finds the relevant snapshot and returns all components in it (in a format digestible by select2) */
	getComponentsFromSnapshot: function(testSysId, stepOrder, methods) {
		if (!methods)
			methods = "";

		var mugshotCacheComponents = new sn_atf.ATFSnapshot().getUIComponentsFromMugshotCache(testSysId, stepOrder);
		var uiComponents = {};
		var snapshotId = this.findSnapshot(testSysId, stepOrder);
		if (snapshotId) {
			var componentsByType = new sn_atf.ATFSnapshot().getUIComponentsByType(snapshotId, methods);
			componentsByType = this._addMugshotCacheComponents(componentsByType, mugshotCacheComponents);
			uiComponents['children'] = componentsByType;
		} else
			uiComponents['children'] = mugshotCacheComponents;

		var results = [];
		results.push(uiComponents);

		var components = {};
		components['results'] = results;
		return components;
	},

	/** Given a test sys_id and step order, finds the relevant snapshot and returns all components in it as a choice list */
	getComponentsFromSnapshotAsChoiceList: function(currentStepGR) {
        var methods = "";
        if (currentStepGR.step_config.toString() === "def25c4b73730300c79260bdfaf6a700")
        	methods = "click";

		var mugshotCacheComponents = new sn_atf.ATFSnapshot().getUIComponentsFromMugshotCache(currentStepGR.test, currentStepGR.order);
		var components;
		var snapshotId = this.findSnapshot(currentStepGR.test, currentStepGR.order);
		if (snapshotId) {
			components = new sn_atf.ATFSnapshot().getUIComponentsByType(snapshotId, methods);
			components = this._addMugshotCacheComponents(components, mugshotCacheComponents);
		} else
			components = mugshotCacheComponents;

		var componentChoiceList = new GlideChoiceList();
		for (var i = 0; i < components.length; i += 1) {
			var component = components[i];
			// component.id is the locator here (it has to be 'id' for select2 to work correctly)
			componentChoiceList.add(new GlideChoice(component.id, component.text + ' [' + component.component_id + '] <' + component.tag + '>'));
		}

		return componentChoiceList;
	},

	findSnapshot: function(testSysId, stepOrder) {
		return new sn_atf.ATFSnapshot().findSnapshot(testSysId, stepOrder);
	},

	/**
	 * Adds components from the mugshot cache if they don't already exist in the list of components
	 */
	_addMugshotCacheComponents: function(components, mugshotCacheComponents) {
		var existingMugshotHashes = [];
		for (var i = 0; i < components.length; i += 1)
			existingMugshotHashes.push(components[i].id);

		for (i = 0; i < mugshotCacheComponents.length; i += 1) {
			var mugshotCacheComponent = mugshotCacheComponents[i];
			if (existingMugshotHashes.indexOf(mugshotCacheComponent.id) === -1) {
				components.push(mugshotCacheComponent);
				existingMugshotHashes.push(mugshotCacheComponent.id);
			}
		}

		return components;
	},

    type: 'ATFSnapshotHelper'
});
```