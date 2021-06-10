---
title: "PADiagnosticsWorker"
id: "padiagnosticsworker"
---

API Name: sn_pa_diagnostics.PADiagnosticsWorker

```js
var PADiagnosticsWorker = Class.create();
PADiagnosticsWorker.prototype = {
	initialize: function() {
		this.paDiagnostics = new PADiagnostics();
	},

	/**
	 * Execute all active diagnostics
	 *
	 * @return executionID
	 */
	executeAll: function(table, id) {
		return this.paDiagnostics.executeAll(table, id);
	},

	/**
	 * Execute diagnostics based on the given sys_ids
	 *
	 * @param sysIDs
	 * @return executionID
	 */
	execute: function(sysIDs, table, id) {
		return this.paDiagnostics.execute(sysIDs, table, id);
	},

    type: 'PADiagnosticsWorker'
};
```