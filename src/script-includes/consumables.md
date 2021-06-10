---
title: "Consumables"
id: "consumables"
---

API Name: global.Consumables

```js
var Consumables = Class.create();
Consumables.prototype = {
	initialize : function() {
	},

	cancelFromDisposal: function (consumable, status, substatus, stockroom, current_stockroom) {
		var current = new GlideRecord('alm_consumable');
		current.get(consumable);
		if (GlidePluginManager.isActive('com.sn_hamp')) {
			new sn_hamp.HampHWDisposalUtils().cancelFromDisposal(current);
		}
		// Update the current record
		current.setValue('install_status', status);
		current.setValue('substatus', substatus);
		if (current_stockroom == '') {
			current.setValue('stockroom', stockroom);
		}
		current.setValue('planned_for_disposal', false);
		current.update();
	},

	markReadyForDisposal: function (consumable, qty, status, substatus) {
		var redirectId = consumable;
		var consumableGr = this._getConsumable(consumable);
		var split = (parseInt(consumableGr.quantity,10) > parseInt(qty,10)) ? true : false;
		if (split) {
			var unitCost = consumableGr.cost / consumableGr.quantity;
			// Update fields of original consumable
			consumableGr.quantity = consumableGr.quantity - qty;
			consumableGr.update();
			// Inserting new consumable
			consumableGr.quantity = qty;
			consumableGr.cost = unitCost * qty;
			consumableGr.install_status = status;
			consumableGr.substatus = substatus;
			consumableGr.planned_for_disposal = true;
			redirectId = consumableGr.insert();
		} else {
			// Marking entire quantity as ready for disposal, so update original record
			consumableGr.substatus = substatus;
			consumableGr.planned_for_disposal = true;
			consumableGr.update();
		}

		if (qty === '1') {
			gs.addInfoMessage(gs.getMessage('{0} asset marked for disposal', qty));
		} else {
			gs.addInfoMessage(gs.getMessage('{0} assets marked for disposal', qty));
		}
		return redirectId;
	},

	retireConsumable: function (sys_id, qty, status, substatus, stockroom) {
		var redirectSysId;
		var consumable = this._getConsumable(sys_id);
		var split = (parseInt(consumable.quantity,10) != parseInt(qty,10));
		var unitCost = consumable.cost / consumable.quantity;

		if (split) {
			// Update fields of original consumable
			consumable.quantity = consumable.quantity - qty;
			consumable.update();
			// Inserting new consumable
			consumable.quantity = qty;
			consumable.cost = unitCost * qty;
			consumable.install_status = status;
			consumable.substatus = substatus;
			consumable.stockroom = stockroom;
			consumable.parent = '';
			redirectSysId = consumable.insert();

			var tableName = consumable.getValue('sys_class_name');
			var parms = [];
			var msgText;
			parms.push(qty);
			if (qty === '1') {
				msgText = gs.getMessage('asset');
			} else {
				msgText = gs.getMessage('assets');
			}
			parms.push(msgText);
			gs.addInfoMessage(gs.getMessage('{0} {1} has been retired', parms));
		} else {
			// Retiring entire quantity, so update original record
			consumable.install_status = status;
			consumable.substatus = substatus;
			consumable.parent = '';
			consumable.stockroom = stockroom;
			consumable.update();

			if (qty === '1') {
				gs.addInfoMessage(gs.getMessage('{0} asset has been retired', qty));
			} else {
				gs.addInfoMessage(gs.getMessage('{0} assets have been retired', qty));
			}
		}
	},

	splitForeground : function(sys_id, qty, status, substatus, asset, stockroom, location, assigned_to) {
		this.split(sys_id, qty, status, substatus, asset, stockroom, location, assigned_to);
		if (asset != '') {
			var assetRecord = new GlideRecord('alm_asset');
			if (assetRecord.get(asset)) {
				if (qty == 1)
					gs.addInfoMessage(gs.getMessage('One item has been consumed and attached to {0}', assetRecord.getDisplayValue()));
			    else if (qty > 1)
		            gs.addInfoMessage(gs.getMessage('{0} items have been consumed and attached to {1}', [qty + '', assetRecord.getDisplayValue()]));
		    }
	    }
		if (assigned_to != '') {
			var userRecord = new GlideRecord('sys_user');
			if (userRecord.get(assigned_to)) {
				if (qty == 1)
					gs.addInfoMessage(gs.getMessage('One item has been consumed and attached to {0}', userRecord.getDisplayValue()));
			    else if (qty > 1)
		            gs.addInfoMessage(gs.getMessage('{0} items have been consumed and attached to {1}', [qty + '', userRecord.getDisplayValue()]));
		    }
	    }
	},
		
	split : function(sys_id, qty, status, substatus, asset, stockroom, location, assigned_to) {
		var consumable = this._getConsumable(sys_id);
		if (parseInt(qty,10) > parseInt(consumable.quantity,10)) {
			gs.addErrorMessage(gs.getMessage(
					'Trying to split {0} when only {1} exist', [ qty + '',
							consumable.quantity + '' ]));
			return consumable;
		}
		var split = (parseInt(consumable.quantity,10) != parseInt(qty,10));
		if (split) {
			cost = consumable.cost / consumable.quantity;
			consumable.quantity = consumable.quantity - qty;
			consumable.update();
			consumable.quantity = qty;
			consumable.cost = cost * qty;
		}
		consumable.install_status = status;
		consumable.substatus = substatus;
		if (asset != '') {
			// Asset is being split and associated with real asset.
			consumable.parent = asset;
			consumable.assigned_to = assigned_to;
		} else {
			// Only setting these fields when the split consumable is
			// not associated with a real asset. For real-assets,
			// downstream BRs manage these assignments.
			consumable.stockroom = stockroom;
			consumable.location = location;
			consumable.assigned_to = assigned_to;
		}
		if (split)
			return consumable.insert();
		else
			return consumable.update();
	},

	getMaxInState : function(model, stockroom, status, substatus, asset) {
		var qty = 0;
		var gr = new GlideRecord('alm_asset');
		gr.addQuery('stockroom', stockroom);
		gr.addQuery('install_status', status);
		gr.addQuery('substatus', substatus);
		gr.addQuery('model', model);
		if (asset != '')
			gr.addQuery('sys_id', asset);
		gr.query();
		if (gr.next())
			qty = gr.quantity;

		return qty;
	},

	_getConsumable : function(sys_id) {
		var consumable = new GlideRecord('alm_consumable');
		consumable.addQuery('sys_id', sys_id);
		consumable.query();
		consumable.next();
		return consumable;
	},

	mergeConsumable : function(current) {
		
		var doRedirect = false;
		if ((!current.nil()) && (!current.doRedirect.nil()))
			doRedirect = current.doRedirect;
		
		var gr = new GlideRecord('alm_consumable');
		gr.addQuery('model', current.model);
		gr.addQuery('location', current.location);
		gr.addQuery('model_category', current.model_category);
		gr.addQuery('stockroom', current.stockroom);
		gr.addQuery('install_status', current.install_status);
		gr.addQuery('substatus', current.substatus);
		gr.addQuery('parent', current.parent);
		gr.addQuery('assigned_to', current.assigned_to);
		gr.addQuery('sys_domain', current.sys_domain);
		if (SNC.AssetMgmtUtil.isPluginRegistered('com.snc.procurement')) {
			if (current.install_status == 2)
				gr.addQuery('purchase_line', current.purchase_line);
		}
		if (current.active_to == true)
			gr.addQuery('active_to', true);
		else
			gr.addQuery('active_to', false).addOrCondition('active_to', null);
		gr.addNullQuery('planned_for_disposal').addOrCondition('planned_for_disposal', false);
		gr.query();

		while (gr.next()) {
			if (gr.sys_id != current.sys_id) {
				var parms = [];
				parms.push(gr.getDisplayValue('stockroom'));
				parms.push(gr.getDisplayValue('install_status'));
				parms.push(gr.getDisplayValue('substatus'));
				// eslint-disable-next-line  max-len
				gs.addInfoMessage(gs.getMessage('Merged updated record with previous record with similar attributes: Stockroom - {0}, State - {1}, Substate - {2}', parms));
				gr.quantity = parseInt(gr.quantity,10) + parseInt(current.quantity,10);
				gr.cost = parseFloat(gr.cost) + parseFloat(current.cost);
				gr.update();
				if (new TableUtils("sm_asset_usage").tableExists()) {
			
					var assetUsageRecords = new GlideRecord('sm_asset_usage');
					
					assetUsageRecords.addQuery('asset', current.sys_id);
					assetUsageRecords.setValue('asset', gr.getUniqueValue());
					assetUsageRecords.updateMultiple();
		        }
				current.deleteRecord();
				current = gr;
				if (doRedirect == true)
					action.setRedirectURL(gr);
				break;
			}
		}
	},

	type : 'Consumables'
};
```