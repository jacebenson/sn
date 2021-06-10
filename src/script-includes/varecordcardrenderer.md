---
title: "VaRecordCardRenderer"
id: "varecordcardrenderer"
---

API Name: global.VaRecordCardRenderer

```js
var VaRecordCardRenderer = Class.create();
VaRecordCardRenderer.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

	_htmlAllowedTypes: ['html', 'journal_input', 'journal_list'],

	initialize: function(skipNullField) {
		this.skipNullField = skipNullField ? skipNullField : false;
	},

	createFields: function (fieldList, gr) {
		var fields = [];
		for (var i in fieldList) {
			fields.push(this.createField(fieldList[i], gr, null, null));
		}
		return fields;
	},

	createField: function(field, gr, url, value) {
		var fieldObject = {label: null, value: null, url: null};
		try {
			var element = gr.getElement(field);
			fieldObject.label = element.getLabel();
			fieldObject.value = value == null ? gr.getDisplayValue(field) : value;
			fieldObject.type = element.getED().getInternalType();
			fieldObject.url = url;
		}
		catch (exception) {
			gs.error('Error creating field for the card view ' + field);
		}
		return fieldObject;
	},

	createStaticField: function(label, value, url) {
		return {label: label, value: value, url: url};
	},

	// Generate the HTML with a title as a URL to the record(first row in the table) and table with rows as fields and corresponding values.
	renderCard: function(title, fields) {
		var html = '';
		html += '<div style="border: 1px solid rgb(230, 232, 234); border-radius: 5px; background-color: white; word-break: normal;">';

		html += '<table>';
		// Title is the first row in the table.
		if (title && title.url && title.label)
			html += this._getTitleRow(title.url, title.label);

		// Generate HTML for table rows.
		for (var i in fields) {
			var label = fields[i].label;

			var value = this._htmlAllowedTypes.indexOf('' + fields[i].type) != -1
				? fields[i].value
				: GlideStringUtil.escapeHTML(fields[i].value);
			value = this._removeCodeTags(value);

			var url = fields[i].url;

			// Do not add the value to the table if skipNullField flag is set to true and value is null (or empty)
			if (this.skipNullField && !value)
				continue;

			html += url ? this._getTableRow(label, this._getHyperLink(url, value)) : this._getTableRow(label, value);
		}

		html += '</table></div>';

		return html;
	},

	_hasCodeTags: function(value) {
		if (gs.nil(value)) return 'false';
		if (gs.getProperty('glide.ui.security.allow_codetag') !== 'true') return 'false';
		return value.indexOf('[code]') !== -1 && value.indexOf('[/code]') !== -1 ? 'true' : 'false';
	},

	_removeCodeTags: function(value) {
		if (gs.nil(value)) return value;
		if (this._hasCodeTags(value) !== 'true') return value;
		return value.replaceAll('[code]', '').replaceAll('[/code]', '');
	},

	_getHyperLink: function(url, label) {
		return '<a target="_blank" href="' + url + '">' + label + '</a>';
	},

	_getTableRow: function(label, value) {
		return '<tr><td style="padding:5px; width:30px; font-weight: bold; vertical-align: top"><div style="overflow: hidden; max-height: 56px;">' + label + '</div><td style="overflow-wrap: break-word;word-break:break-word;">' + value + '</td></tr>';
	},
	_getTitleRow: function(url, label) {
		return '<tr><td style="padding:5px;" colspan="2">' + this._getHyperLink(url, label) + '</td></tr>';
	},

	// Get the most recent comment and trim it upto 60 characters (if not [code] tagged)
	getLastComment: function(tableName, record) {
		var lastComment = null;
		var last = new GlideRecord("sys_journal_field");
		last.addQuery("name", tableName);
		last.addQuery("element", "comments");
		last.addQuery("element_id", record);
		last.orderByDesc('sys_created_on');
		last.setLimit(1);
		last.query();
		if (last.next()) {
			var comment = last.getDisplayValue('value');
			if (this._hasCodeTags(comment)) {
				lastComment = this._removeCodeTags(comment);
			} else {
				lastComment = comment.length < 60 ? comment : (comment.substring(0,60) + '...');
			}
		}

		return lastComment;
	},

	type: 'VaRecordCardRenderer'
});
```