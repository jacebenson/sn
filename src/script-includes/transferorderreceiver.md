---
title: "TransferOrderReceiver"
id: "transferorderreceiver"
---

API Name: global.TransferOrderReceiver

```js
var TransferOrderReceiver = Class.create();
TransferOrderReceiver.prototype = {
	initialize : function() {
	},

	receiveAssets : function(sysId, received) {
		var transferOrderLine = new GlideRecord('alm_transfer_order_line');
		transferOrderLine.get(sysId);

		if (transferOrderLine.quantity_received)
			transferOrderLine.quantity_received = Number(transferOrderLine.quantity_received) + received;
		else
			transferOrderLine.quantity_received = received;

		var requested;
		if (transferOrderLine.quantity_remaining && transferOrderLine.quantity_remaining != 0)
			requested = transferOrderLine.quantity_remaining;
		else
			requested = transferOrderLine.quantity_requested;

		var returned = (transferOrderLine.quantity_returned != null) ? transferOrderLine.quantity_returned : 0;

		transferOrderLine.quantity_remaining = transferOrderLine.quantity_requested - transferOrderLine.quantity_received;

		if (parseInt(transferOrderLine.quantity_remaining) === 0){
			transferOrderLine.stage = 'received';
			
			// Close 'received' task if not yet closed, when the tol changes to 'received'
			var tolTaskGr = new GlideRecord('alm_transfer_order_line_task');
			tolTaskGr.addQuery('transfer_order_line', sysId);
			tolTaskGr.addQuery('stage', 'received');
			// State = -5 = Pending, State = 1 = Open, State = 2 = Work In Progress
			tolTaskGr.addQuery('state', 'IN', '-5,1,2');
			tolTaskGr.query();
			if(tolTaskGr.next()){
				// Close subtask(s) of this task
                var subtaskGr = new GlideRecord('alm_transfer_order_line_subtask');
                subtaskGr.addQuery('task', tolTaskGr.getUniqueValue());
                // State = 3 = Closed Complete
                subtaskGr.setValue('state', 3);
                subtaskGr.setWorkflow(false);
                subtaskGr.updateMultiple();
                
				// state = 3 = Closed Complete
				tolTaskGr.setValue('state', 3);
				tolTaskGr.setWorkflow(false);
				tolTaskGr.update();
				
				// Propagate stage change to TO
				var tolGr = new GlideRecord('alm_transfer_order_line');
				tolGr.get(sysId);
				var transferOrderStageHandler = new TransferOrderStageHandler();
				transferOrderStageHandler.pushStageFromTOL(tolGr, 'received');
			}	
		}	

		var subStatus;
		if (SNC.AssetMgmtUtil.isPluginRegistered('com.snc.work_management') &&
				!transferOrderLine.transfer_order.service_order_task.nil())
			subStatus = 'reserved';
		else if (SNC.AssetMgmtUtil.isPluginRegistered('com.snc.field_service_management') &&
				!transferOrderLine.transfer_order.service_order.nil())
			subStatus = 'reserved';
		else
		
			subStatus = 'available';

		// This is for the partial receive of consumables
		// the else takes care of the full receive for fsm transfer orders of consumables
		if (0 != transferOrderLine.quantity_remaining) {
		    var consumableId = new Consumables().split(transferOrderLine.asset,
					received, '6', subStatus, '',
					transferOrderLine.transfer_order.to_stockroom,
					transferOrderLine.transfer_order.to_location,
					transferOrderLine.asset.assigned_to);
			if (subStatus != 'reserved') {
				var consumable = new GlideRecord('alm_consumable');
				consumable.get(consumableId);
				consumable.active_to = false;
				consumable.update();
			}
		} else if ((transferOrderLine.model.sys_class_name == 'cmdb_consumable_product_model' ||
					transferOrderLine.model.asset_tracking_strategy == 'track_as_consumable') &&
					'reserved' == subStatus) {
			var consumable = new GlideRecord('alm_consumable');
			consumable.addQuery('sys_id', transferOrderLine.asset);
			consumable.query();
			if (consumable.next()) {
				var model = consumable.model;
				consumable.stockroom = transferOrderLine.transfer_order.to_stockroom;
				consumable.location = transferOrderLine.transfer_order.to_location;
				consumable.install_status = '6';
				consumable.substatus = 'reserved';
				consumable.update();
				consumable = new GlideRecord('alm_consumable');
				consumable.addQuery('model', model);
				consumable.addQuery('stockroom', transferOrderLine.transfer_order.to_stockroom);
				consumable.addQuery('location', transferOrderLine.transfer_order.to_location);
				consumable.addQuery('install_status', '6');
				consumable.addQuery('substatus', 'reserved');
				consumable.addQuery('active_to', true);
				consumable.query();
				if (consumable.next())
					transferOrderLine.asset = consumable.sys_id;
			}

		}

		transferOrderLine.update();
	},
	
	setItemDelivered : function(sys_id){
		var transferOrderLine = new GlideRecord('alm_transfer_order_line');
		transferOrderLine.get(sys_id);
		if (transferOrderLine.stage == 'received')
			transferOrderLine.stage = 'delivered';
		transferOrderLine.update();
		new TransferOrderStageHandler().pushStageFromTOL(current,'delivered'); 
	},

	type : 'TransferOrderReceiver'
};
```