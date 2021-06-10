---
title: "GlideAutomateUtil"
id: "glideautomateutil"
---

API Name: global.GlideAutomateUtil

```js
var GlideAutomateUtil = Class.create();
GlideAutomateUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	/**
	 * Override AbstractAjaxProcessor.process(), allows functions to be callable from both clients via AJAX or from other scripts
	 * All client-callable functions must be registered here
	 */
	process: function() {
		var name = this.getParameter("sysparm_name");
		if (name == "getProperties")
			return JSON.stringify(this.getProperties());
		else if (name == "getCurrentMugshotVersion")
			return this.getCurrentMugshotVersion();
	},

	/**
	 * Gets a JSON object that contains all properties for GlideAutomate (e.g. debug, trim components, etc.)
	 */
	getProperties: function() {
		return {
			"debug": GlideProperties.getBoolean("sn_atf.debug", false),
			"trimComponents": sn_atf.AutomatedTestingFramework.isComponentTrimEnabled(),
		    "domMutationOnlyIntervalMs": GlideProperties.getInt("sn_atf.custom_ui.wait.dom_mutation_only_interval_ms", 800)
		};
	},

	/**
	 * Gets the current mugshot version, as specified by the (maint-only) sn_atf.custom_ui.mugshot_version sys_property
	 */
	getCurrentMugshotVersion: function() {
		return sn_atf.ATFSnapshot.getMugshotVersion();
	},

    type: 'GlideAutomateUtil'
});
```