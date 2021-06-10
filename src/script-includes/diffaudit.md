---
title: "DiffAudit"
id: "diffaudit"
---

API Name: global.DiffAudit

```js
var DiffAudit = Class.create();
DiffAudit.prototype = {
    initialize: function() {
		this.compressed_header = "COMPRESSEDDATA:";
    },
	
	getTemplate: function(html, left, right){
        var jr = new GlideJellyRunner();
        jr.setEscaping(false);
        jr.setVariable("jvar_table", html);
        jr.setVariable("jvar_left", left);
        jr.setVariable("jvar_right", right);
        return jr.runFromTemplate("diff_html_viewer.xml");
    },


	getDiff: function (args) {
		var differ = new Differ();
		
		var oldSysId = args["sysparm_old_sys_id"];
		var newSysId = args["sysparm_new_sys_id"];
		var tableName = args["sysparm_table"];
		
		var oldValueCaption = args["sysparm_old_value_caption"];
		var newValueCaption = args["sysparm_new_value_caption"];
		
		var oldValueField   = args["sysparm_old_value_field"];
		var newValueField   = args["sysparm_new_value_field"];
		var showIdenticalDiff   = args["sysparm_show_identical_diff"];

		var gr = new GlideRecord(tableName + '');
		if (!gr.isValid()) {
			gs.logWarning("Invalid table name: " + tableName, "DiffAudit.getDiff");
			return;
		}
		if (!gr.isValidField(oldValueField + '')) {
			gs.logWarning("The table " + tableName + " does not contain field " + oldValueField, "DiffAudit.getDiff");
			return;			
		}

		if (!gr.isValidField(newValueField + '')) {
			gs.logWarning("The table " + tableName + " does not contain field " + newValueField, "DiffAudit.getDiff");
			return;			
		}
		
		if (gr.get(oldSysId + '')) {
			if (!gr.canRead()) {
				gs.logWarning("Security restricted: cannot read", "DiffAudit.getDiff");
				return;
			}
			var oldValue = this._getRealValue(gr.getValue(oldValueField + ''));
			if (JSUtil.nil(oldValue))
				oldValue = ' ';

			gr = new GlideRecord(tableName + '');
			if (gr.get(newSysId + '')) {
				if (!gr.canRead()) {
					gs.logWarning("Security restricted: cannot read", "DiffAudit.getDiff");
					return;
				}
				var newValue = this._getRealValue(gr.getValue(newValueField + ''));
				if (JSUtil.nil(newValue))
					newValue = ' ';
			
			
				var d = differ.diff(oldValue, newValue, '', showIdenticalDiff);
			
				//no diff, left and right identical and showIdenticalDiff=false
				if (d == "")
					return "";
			

				var html = this.getTemplate(d, oldValueCaption, newValueCaption);
				return html;
			}else {
				gs.logWarning("New record not found: " + newSysId, "DiffAudit.getDiff");
				return;
			}
		}else {
			gs.logWarning("Old record not found: " + oldSysId, "DiffAudit.getDiff");
			return;
		}
			
	},
	
	_getRealValue: function(value) {
		if (this._isCompressed(value))
			return this._decompress(value);
	
		return value;
	},
	
	_decompress: function(value) {
		var encoded = value.substring(this.compressed_header.length, value.length);
		var cs = GlideStringUtil.base64DecodeAsBytes(encoded);
		return String(GlideCompressionUtil.expandToString(cs));
	},

	_isCompressed: function(value) {
		if (GlideStringUtil.nil(value))
			return false;

		// sanity check one: does it start with compressed header
		if (!value.startsWith(this.compressed_header))
			return false;

		// sanity check two: do the first 64 characters look like base64?
		if (value.length < this.compressed_header.length + 64)
			return true; // trust it in this case

		var nibble = value.substring(this.compressed_header.length, 64);
		return GlideStringUtil.isBase64(nibble);
	},

    type: 'DiffAudit'
};
```