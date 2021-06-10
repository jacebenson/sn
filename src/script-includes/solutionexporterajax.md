---
title: "SolutionExporterAjax"
id: "solutionexporterajax"
---

API Name: global.SolutionExporterAjax

```js
var SolutionExporterAjax = Class.create();
SolutionExporterAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	process: function() {
		var sysId = this.getParameter("sysparm_ajax_processor_sys_id");
		var gr = new GlideRecord('ml_capability_definition_base');
		gr.get(sysId);
		
		// Run export in background
		var worker = new GlideScriptedHierarchicalWorker();
		worker.setProgressName("Exporting Solution");
		worker.setScriptIncludeName("SolutionExporter");
		worker.setScriptIncludeMethod("exportSolutionDefinition");
		worker.putMethodArg("solutionDefinition", gr);
		worker.setSource(sysId);
		worker.setSourceTable("ml_capability_definition_base");
		worker.setBackground(true);
		worker.setCannotCancel(true);
		worker.start();
		
		return worker.getProgressID();
	},
	
    type: 'SolutionExporterAjax'
});
```