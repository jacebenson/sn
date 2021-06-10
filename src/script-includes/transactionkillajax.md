---
title: "TransactionKillAjax"
id: "transactionkillajax"
---

API Name: global.TransactionKillAjax

```js
var TransactionKillAjax = Class.create();
TransactionKillAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    forceKill: function() {
    	if (!gs.hasRole('admin'))
    	    return;
        var sessionID = this.getParameter('sysparm_session_id');
        GlideTransactionManager.forceKill(sessionID);
        gs.addInfoMessage(gs.getMessage('Force kill message sent to all transactions with session {0}', sessionID));
        gs.addInfoMessage(gs.getMessage('Transaction may not terminate immediately'));
    },
	
	forceKillCluster: function() {
	        if (!gs.hasRole('admin'))
	                return;
		var sessionID = this.getParameter('sysparm_session_id');
		var nodeID = this.getParameter('sysparm_node_id');
		var currentNodeID = GlideClusterSynchronizer.getSystemID();
		if (nodeID == currentNodeID) {
			GlideTransactionManager.forceKill(sessionID);
		} else {
			var cancelScript = "GlideTransactionManager.forceKill('" + sessionID + "');";
			GlideClusterMessage.postScript(cancelScript, nodeID);
		}
		gs.addInfoMessage(gs.getMessage('Force kill message sent to node: {0}', nodeID));
		gs.addInfoMessage(gs.getMessage('Transaction may not terminate immediately. <a href="loading_transactions.do">Refresh</a>'));
	},
	
	isPublic: function() {
		return false;
	},

    toString: function() { return 'TransactionKillAjax'; }
});

```