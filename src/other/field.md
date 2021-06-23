---
id: attributes-field
title: Field Attributes
---

## Overview


A list of all the variable attributes that could be found here on the
[docs](https://docs.servicenow.com/bundle/jakarta-it-service-management/page/product/service-catalog-management/reference/variable-attributes.html#variable-attributes).

## glide_list

Value: `true/false`\
Target Variable: List collector\
Changes the list collector interface from slushbucket to glide list.


Attribute
Value
Target element
Description

## accept_code

Value: Unknown\
Target element: Data Object, Data Structure

## actual_state

Value: true/false\
Target element: String, Integer

## allow_invalid

Value: true/false\
Target element: Reference

## allow_journal

Value: true/false\
Target element: Template Value

## allow_null

Value: true/false\
Target element: field_name field\
Description: If present or true, allows entering "None" as the field
|
## allow_order
Value: true/false
Target element: Conditions


## allow_public
Value: true/false
Target element: Reference, String, Table Name


## allow_references
Value: true/false
Target element: field\_name field
| If true, a tree is displayed to select from that includes reference fields so you can dot-walk.
|
## allow_related_list_query
Value: true/false
| condition field
| this allows RLQUERY type calls which reduces the need for database views. [Source](https://youtu.be/s2aRGT9WIRk?t=1113)
|
## allow_tables
Value: table name
| Table Name


## approval_user
Value: name of field containing the user(s) for the approval type this field represents
| integer field
| The fields of the table are used to perform the lookup using a matcher. Approvals are specified as fields in the table that have an attribute of approval\_user=, where indicates the field in the table that contains the users for this approval type. Fields with this attribute contain an integer value that indicates the sequence for the approvals. All approval fields with the same sequence number indicate that multiple approvals are required before continuing. Approvals are requested in the order of the sequence numbers. For example, all approvals with sequence number 100 must be approved before approvals with sequence number 200 are requested. |
## attachment_index
Value: true/false
| any table
| If true, attachments on the table are indexed for search purposes. See Enable Attachment Indexing.
|
## audit
Value: true/false
| String


## barcode
Value: true/false
| string field
| Allows a string field in the Native mobile app to access a mobile device's camera to scan and process a bar code.
|
## base_start
Value: true/false
| Table Name


## base_table
Value: name of base table type
## table_name` field
| A table\_name field allows the user to choose any table derived from the table specified by this attribute. By default, the base table itself is also included in the choice list (but see skip\_root to turn off this behavior).
|
## calendar_elements
Value: list of field names, separated by semicolons (";")
| any calendar event table
| Specifies a list of fields to be used when constructing the description of a calendar event. If not specified, the usual display name plus short description are used.The calendar\_elements attribute does not support derived (dot-walked) fields.
|
## can_group
Value: true/false
| String


## clean_reference
Value: true/false
| Auto IncrementReference


## client_script
Value: true/false
| Script, Script (Plain)


## close_states
Value: inactive state integer values
| task state field
| Used by the TaskStateUtil API - identifies the list inactive state values delimited by semicolons (;)
|
## collection_interval
Value: interval specified as "HH:MM:SS" (like "01:02:30" for one hour, two minutes, and thirty seconds) | collection field
| Specifies the interval of metrics collection.
|
## cond_field_ref
Value: condition
| String


## condition_builder
Value: "v2"
| Conditions


## convert_urls
Value: true/false
| HTML, HTML Script


## critical
Value: true/false
| any field in the apm\_application table
| Defines fields that are critical information about an application. This allows tracking the entry of critical information.
|
## current_location
Value: true/false
| string field
| Allows a string field in the Native mobile app to access the GPS location of a mobile device.
|
## dashboard_filter
Value: true/false
| Floating Point Number


## dashboard_filter
Value: true/false
| String


## default_close_state
Value: state integer value
| task state field
| Used by the TaskStateUtil API - identifies the default close state value for a task table
|
## default_display_name
Value: true/false
| Field List


## default_rows
Value: integer value
| mulitext fields
| Sets the default number of rows in a multitext field.
|
## default_work_state
Value: state integer value
| task state field
| Used by the TaskStateUtil API - identifies the default working state value for a task table
|
## desired_state
Value: true/false
| Integer


## detail_row
Value: name of field to display in detail row
| any table
| Displays the value of the specified field as a detail row for each record in the list view. UI15 is required to use this attribute.Note: If different detail\_row attributes are defined for a parent table and a child table, the system uses the child table attribute.
|
## disable_execute_now
Value: true/false
| any table derived from sys\_auto
| If present or true, disables the usual Execute Now button. This is used by applications using schedules (such as Discovery) to substitute their own more appropriate action.
|
## edge_encryption_clear_text_allowed` 
| true/false
| field
| When set to true, allows server-side scripts to append non-encrypted data to an encrypted string within the field.
|
## edge_encryption_enabled
Value: true/false
| field
| When set to true, the field is eligible for encryption through an encryption configuration. Because this attribute is used by the system and cannot be modified, it is not always displayed to the user.Note: This attribute does not indicate that a field is encrypted, nor does it trigger any encryption logic on the field. Rather, the attribute determines the possibility of the field being encrypted by a user.
|
## edge_encryption_excluded
Value: true/false
| table
| When set to true, the field or table cannot be encrypted.
|
## element_mapping_provider
Value: Java class
| ChoiceConditionsDocument IDIntegerName-Value PairsReferenceSlush BucketStringVariable ConditionsVariable template value


## email_client
Value: true/false
| any table
| If present or true, causes an icon (an envelope) to appear in the more options menu in the form header. If clicked, a popup email client appears.
|
## exclude_auto_recovery
Value: true/false
| any table
| Disables automatic recovery of draft records for this table and its extensions.
|
## exclusive_dynamics
Value: true/false
| Template Value


## extended_operators
Value: operators
| Conditions


## extensions_only
Value: true/false
| any table
| Table should only have records in tables that extend it. For example, the Task table has this attribute because you would create incident, problem, change records and not task records.
|
## field_decorations
Value: UI Macro name list, separated by semicolons (";")
| most fields (except multi-line text fields)
| Similar to ref\_contributions, causes the named UI macro to be invoked when the field is rendered on a form.
|
## field_list_dependent
Value: true/false
| List


## field_list_selector
Value: true/false
| any glide\_list
| Allows the user to select a field from the dependent table (or current if dependent is not specified). This is used in some workflow activities.
|
## file_column
Value: "sys\_update\_name"
| String


## format
Value: format name
| any numeric field
| Specifies a named format to use instead of the standard numeric formatting. Options are:glide\_duration: formats a time specified in milliseconds as ddd hh:mm:ss.none: disables automatic number formatting (for example, changes 2,500 to 2500).
|
## full_screen
Value: true/false
| HTML


## fv
Value: table name; field name; `sys_id`
## field_value` field
| This uses the three values to set the display of the field\_value field.
|
## glide.db.oracle.ps.query
Value: true/false
| any table
| If present and false, prevents the use of Oracle prepared queries on the table.
|
## global_visibility
Value: true/false
| any table with a `sys_domain` column
| If present or true, makes this table visible globally even if there are domain restrictions (that is, the sys\_domain field has a value).
|
## hasLabels
Value: true/false
| any table
| If present or true, marks this table as being the target of a label at some point. This attribute can be set manually, but it is set automatically whenever a label is generated. When true, the label engine will run on any change to the table, updating the labels as needed.
|
## hasListeners
Value: true/false
| any table
| If present or true, marks this table as available for listeners to get events (insert, update, delete) on.
|
## hasWorkflow
Value: true/false
| any table
| Tells the workflow engine to listen for changes to the table, firing events to a workflow when a record associated with a particular workflow has changed.
|
## hide_label
Value: true/false
| Data Structure


## html_sanitize
Value: true/false
| any field
| If present or true, HTML sanitization is enabled for the selected field.
|
## icon_set_property
Value: true/false
| Icon


## icons
Value: name of JavaScript class
| any workflow field
| Specifies a JavaScript class that produces workflow icons.
|
## iconset
Value: "fontawesome"
| Gliph Icon (Bootstrap)


## ignore_filter_on_new
Value: true/false
| Reference, String


## image_refs
Value: true/false
| Wiki


## image
Value: relative path of image file
| any table
| Specifies an image file to be used when the table is used in a module or BSM map. This specification overrides the icons that would otherwise be used for the table.
|
## import_attribute_name
Value: "giver"
| String


## include_container_types
Value: true/false
| any internal\_type field
| Causes the field to render with container (split) types as well other types.
|
## include_sys_id_in_fieldlist
Value: true/false
| Field List


## is_condition_display
Value: true/false
| String


## is_multi_text
Value: true/false
| String, Wiki, Field List


## is_searchable_choice
Value: true/false
| ReferenceString
| If set to true, allows you to search and select the required value for the variable.
|
## isOrder
Value: true/false
| Integer, Decimal


## items
Value: "activityInput:activityOutput"
| Script


## iterativeDelete
Value: true/false
| any table
| If present or true, forces all row deletes to be executed iteratively. Otherwise, some deletes may be performed using a more efficient bulk method.
|
## knowledge_custom
Value: name of JavaScript function
| any field
| Specifies a JavaScript function to implement a custom knowledge search (see knowledge\_search).
|
## knowledge_search
Value: true/false
| string fields
| If present or true, causes a knowledge search icon (a small book) to appear next to the field. Clicking this icon launches a pop-up window for searching the knowledge base, unless a custom knowledge search function has been specified (seeknowledge\_custom).
|
## largeTable
Value: true/false
| any table
| If present or true, marks this table as "large" for the purpose of preventing table locking with specific MySQL database operations (adding/removing a column/index, compacting a table). Without this attribute (or the smallTable attribute), whether a table is large is determined by the glide.db.large.threshold property, or the default value of 5,000.
|
## linkable_column
Value: "state"
| Source Name


## linkable_value
Value: "current"
| Source Name


## list_force_default
Value: true/false
| Reference


## list_layout_ignore
Value: true/false
| Data Object, Glide Var


## list_decoration
Value: "task\_dependency" or "demand\_stage"
| Depenency Field
| Makes a visual of the field for an example look at !
|
## listen
Value: true/false
| any field
| If present or true, causes a call to a JavaScript function named `<tableName>_<fieldName>`Listen, or globalListen if that function does not exist. The function is called with arguments (tableName, fieldName, oldValue, newValue).
|
## live_feed
Value: true/false
| any field
| If present or true, creates a toggle option on the activity formatter header for incidents, tasks, and problems. The toggle provides the choice between the Live Feed for that record (also known as a document feed) or the activity formatter fields already in use. See Activity formatter for more details.
|
## loader_exempt
Value: true/false
| sys\_class\_codeIntegerStringSystem Class NameSystem Class path


## long_label
Value: true/false
| any field
| Long or short labels refer to the label that is displayed for reference fields on a form. For example, if the field contains the caller's email address, the long label would be Caller Email while the short label would just be Email. Usually the placement of the field on the form makes it clear what the field represents. The global property (glide.short.labels) is used to specify the type of labels that are displayed for all reference fields on any form. This global property can be overridden for any field by setting theshort\_label=true or long\_label=true attribute for the field in the Dictionary.
|
## maintain_order
Value: true/false
| any glide\_list
| If present or true, displays the up/down arrow order buttons to the right of the list of selected items.
|
## max_unit
Value: days/hours/minutes/seconds
| Duration
| Sets the maximum unit of time for the duration.
|
## mode_toggler
Value: true/false
| any composite\_name field
| If present or true, causes a name mode toggle icon (a small right-pointing triangle) to appear to the right of the label. Clicking this icon causes the field's rendering to change from a text field accepting . to a pair of reference choice boxes (one for the table, the other for the field). The latter is the default.
|
## model_class
Value: binary Java class name
| any field of type `glide_var
Value: Specifies a model variable within Java code. The model must have a class that implements the IVariablesModel interface.
|
## model_field
Value: see description
| any field of type `glide_var
Value: Identifies a reference field in the record that has the model defined for it. For example, a workflow activity is associated with an activity definition. The activity definition has a related list of questions that make up the model for that activity definition. By using the activity\_definition as the model\_field for the activity, the model for the workflow activity is built by reading the questions that are defined for the referenced activity definition.
|
## mtmlimitfield
Value: "delivery\_plan"
| Reference


## mtmnamer
Value: "com.glideapp.servicecatalog.Category2CatalogNamer"
| Reference


## mtmquerygenerator
Value: "com.glide.misc.ScriptedListGenerator"
| Reference


## mtmqueryscript
Value: "queryForCatItemCategories"
| Reference


## nibble_size
Value: positive integer
| any table affected by the table cleaner.
| Specifies the maximum number of records the table cleaner can delete in a single operation. The default value for this attribute is 250.
|
## nibble_sleep
Value: true/false
| any table affected by the table cleaner.
| If false, causes the table cleaner to perform cleanup operations without a pause between each operation.
|
## no_attachment
Value: true/false
| any table
| If present or true, prevents the attachment icon (a paperclip) from appearing on the form header.
|
## no_attachments
Value: true/false
| any table
| If present or true, attachments will not be checked for and deleted when a record from this table is deleted. Meant for high-activity tables that never have attachments.
|
## no_audit_delete
Value: true/false
| any table
| If present or true, a sys\_audit\_delete record will never be created when a record from this table is deleted. Meant for high-activity tables that never need sys\_audit\_delete information.
|
## no_audit_relation
Value: true/false
| Reference


## no_audit
Value: true/false
| any table
| If present or true, this field will not be audited, even if the table is being audited.
|
## no_auto_map
Value: true/false
| any table
| If true, this field will not be mapped during an import set. This is primarily used for LDAP imports.
|
## no_email
Value: true/false
| any glide\_list field referencing sys\_user
| If present or true, the email box is removed from the glide\_list field like the Watch list field.
|
## no_multiple
Value: true/false
| any glide\_list field
| Hides the select multiple icon.
|
## no_optimize
Value: true/false
| any table affected by the table cleaner.
| If present or true, prevents the MySQL table compaction operation from running on the specified table. The table compaction operation normally runs after the table cleaner deletes at least 50% of the data in the specified table.
|
## no_separation
Value: true/false
| any table
| If present or true, marks this table as not participating in domain separation.
|
## no_sort
Value: true/false
| List, Slush Bucket, Translated Field, UI Action List


## no_text_index
Value: true/false
| any field on a text indexed table
| If a table is text indexed, the no\_text\_index attribute on a field will prevent this field from being included in the text index.
|
## no_truncate
Value: true/false
| any string field
| In a list view, shows the entire text value of the multi-text value in a list, without truncating it. Without this attribute the string is truncated based on the UI property Number of characters displayed in list cells which is 40 by default.
|
## no_update
Value: true/false
| table
| Is true for tables in which records are inserted or deleted but not updated. Prevents the system from creating sys\_mod\_count, sys\_updated\_by, sys\_updated\_on fields in the table when it is created. Does not stop the table from being updated. This attribute is used to save space on high volume system tables, such as syslog and sys\_audit.
|
## no_view
Value: true/false
| any glide\_list field
| Hides the view selected item icon.
|
## omit_sys_original
Value: true/false
| Price, Currrency


## onlineAlter
Value: true/false
| any table
| Tables with the onlineAlter attribute perform MySQL database operations using online schema changes. Online schema changes provides a lock-free table upgrade when adding, modifying, or removing columns and when adding or dropping indexes. Without online schema changes, these changes to the database lock write access during execution. Online schema changes use additional system resources. Oracle databases do not lock tables by default and do not use online schema changes.
|
## op_name_type
Value: "email"
| Template Value


## operations
Value: "DYNAMIC:From email;=:To"
| Template Value


## options
Value: true/false
| Data Structure


## order
Value: numeric value
| model variable fields
| Used internally only (for model variables).
|
## pdf_cell_type
Value: "basic\_image" or "image"
| Basic ImageImage


## plugin_upgrade_update_only
Value: true/false
| String


## popover
Value: true/false
| Reference


## popup_processor
Value: binary Java class name
| any field or table
| Specifies a custom popup processor for processing the field (or all fields in a table).
|
## present_code
Value: true/false
| Data Structure


## preview_first
Value: true/false
| Wiki


## preview_selector
Value: true/false
| Wiki


## readable
Value: true/false
| any conditions field
| When true, causes the conditons field to be rendered in any list view as a human-readable condition (instead of the encoded query actually stored in the database). The form view for this field is unaffected.
|
## readonly_clickthrough
Value: true/false
| Reference, String, Document ID


## record_watcher_blacklist
Value: true/false
| String, User Roles, Glide Var


## ref_ac_columns_search
Value: true/false
| any reference field with an auto completer (see ref\_auto\_completer)
| Causes auto-complete to work with all fields specified in the ref\_ac\_columns attribute. This overrides the default behavior, which searches only the display value column. See Configure auto-complete to match text from any reference field.
|
## ref_ac_columns
Value: list of field names separated by semi-colons
| any reference field with an auto completer (see ref\_auto\_completer)
| Specifies the columns whose display values should appear in an auto completion list in addition to the name. See the cmdb\_ci field (Configuration Item) on the Incident form for a working example.
|
## ref_ac_display_value
Value: true/false
| any reference field with an auto completer (see ref\_auto\_completer)
| Causes the reference field to hide a the display value column so that auto-complete only matches text from the columns listed in the ref\_ac\_columns attribute. This feature requires the use of the AJAXTableCompleter class and the ref\_ac\_columns, ref\_ac\_columns\_search, and ref\_ac\_display\_value attributes. See Remove the display value column.
|
## ref_ac_order_by
Value: field name
| any reference field with an auto completer (see ref\_auto\_completer)
| Specifies the column that will be used to order the auto completion list.
|
## ref_auto_completer
Value: JavaScript class name
| any reference field (can be applied to a table to affect all reference fields on the table.)
| Specifies the name of a JavaScript class (client-side) that creates the list for auto completion choices.*AJAXReferenceCompleter**AJAXTableCompleter**AJAXReferenceChoice*
|
## ref_contributions
Value: UI Macro name list, separated by semicolons (";")
| any reference field
| Causes the named UI macro to be invoked when the field is rendered on a form.
|
## ref_decoration_disabled
Value: true/false
| Reference


## ref_list_label
Value: label text
| any table
| Specifies the title to use in a list banner.
|
## ref_qual_elements
Value: field name list, separated by semicolons (";")
| any reference field with a reference\_qual field
| Specifies a list of fields to be sent back to the server in order to get an updated reference.
|
## ref_sequence
Value: list of fields in referenced table, separated by top hats ("\^")
| any reference field
| Specifies the fields in the referenced table that should be used to order the choice list. This works like an ORDER BY clause in SQL, with each element in ascending order.
|
## reference_types
Value: list of valid reference types that are clickable separated by semicolons (";")
| field\_name field
| Limits the reference fields that are displayed in the tree to the specified types.
|
## remoteDependent
Value: name of database and table (like "model.matcher")
| any script field
| Defines the remote (such as, in another database) table that the script depends on.
|
## repeat_type_field
Value: field name
| a repeat count field for schedule rotation
| Specifies the field that contains the repeat type (daily, weekly, monthly, or yearly).
|
## restrictTo
Value: field name (including indirect, dot-walked field references)
| any conditions field
| Specifies the field that contains the comma-separated list of fields that the conditions should be restricted to using.
|
## ro_collapsible
Value: true/false
| any multi-line field
| If present or true, causes an icon (either a "+" or a "-") to appear next to the field's label, allowing the field itself to be expanded or collapsed.
|
## scale
Value: integer
| Works on Floating Point and Decimal
| If using Decimal change your length from it's value, to a number greater then 19. That seemed to do the trick for me.
|
## script
Value: a function that returns the contents of the field
| any slushbucket field
| Allows you to write a script to define what will be loaded into the slushbucket field.
|
## script
Value: getKBMandatoryFields()
| Slush Bucket


## serializer
Value: Java class
| Breakdown ElementGlide VarPriceStringTranslated HTMLTranslated Text


## short_label
Value: true/false
| any field
| Long or short labels refer to the label that is displayed for reference fields on a form. For example, if the field contains the caller's email address, the long label would be Caller Email while the short label would just be Email. Usually the placement of the field on the form makes it clear what the field represents. The global property (glide.short.labels) is used to specify the type of labels that are displayed for all reference fields on any form. This global property can be overridden for any field by setting theshort\_label=true or long\_label=true attribute for the field in the dictionary.
|
## show_all_tables
Value: true/false
| document ID fields
| Allows users to select documents from system tables. For example, sys\_script or sys\_user. By default, users cannot select records from system tables.
|
## show_condition_count
Value: true/false
| condition fields
| Enables or disables the condition count widget to preview how many records would be returned by a set of conditions. See Add the condition count to a condition field.
|
## show_ops
Value: true/false
| Template Value


## show_secret
Value: true/false
| Password (2 Way Encrypted)


## skip_root
Value: true/false
## table_name` field
| If present or true, removes the base table from the choice list (see base\_table for more details).
|
## sla_basis
Value: list of table names separated by semicolons (";")
| any field of date type (glide\_date\_time, glide\_date, due\_date, date, or datetime)
| Defines the tables for which this field determines the start (open) time of an SLA.
|
## sla_closure
Value: list of table names separated by semicolons (";")
| any field of date type (glide\_date\_time, glide\_date, due\_date, date, or datetime)
| Defines the tables for which this field determines the start (open) time of an SLA.
|
## slushbucket_ref_no_expand
Value: true/false
| any reference field
| If present or true, prevents users from expanding the field from a form or list slushbucket.
|
## smallTable
Value: true/false
| any table
| If present or true, marks this table as "small" (that is, not large) for the purposes of our querying strategy. Without this attribute (or the largeTable attribute), whether a table is large is determined by the glide.db.large.threshold property, or the default value of 5,000.
|
## start_locked
Value: true/false
| any glide\_list field
| Determines whether the field is locked or unlocked by default. Set the value to false to unlock the field by default.
|
## staticDependent
Value: name of table
| any script field
| Defines the table that the script depends on.
|
## storageEncrypted
Value: true/false
| String


## strip_html_in_pdf
Value: true/false
| any field
| Attempts to remove HTML tags from a field when that field is exported to a PDF. Most likely useful on HTML fields.
|
## structure_key
Value: field
| Data Object


## synch_attachments
Value: true/false
| any table
| Similar to update\_synch but writes the record's file attachments to update sets. See Enable Attachment Indexing.
|
## synchronizePartitions
Value: true/false
| domain\_pathDate/TimeDomain IDIntegerStringSys IDSystem Class NameSystem Class path


## table
Value: name of table
| field\_name field
| Displays the fields of the table specified.
|
## tableChoicesScript
Value: name of script include
| table\_name field
| The name of a script include whose process() method returns an array of table names from which to select.
|
## target_form
Value: name of form
| any table
| Specifies the alternative form to be used when this table is referenced through a popup on a reference field.
|
## text_index_filter_junk
Value: true/false
| any table
| Set the value to false to disable the junk filter for the table. By default, Zing does not index or search for 2-digit numbers and single character words (unless they are Chinese or Japanese characters). You must regenerate the index after disabling the junk filter. This attribute results in a larger table index. For optimal performance, do not apply it unless it is required.
|
## text_index_translation
Value: true/false
| any table
| If present or true, forces indexes to be recalculated when translated strings are added. Requires sys-admin role to modify. Automatically set for indexed fields that are translated, and to fields that have a translation and are being indexed. This attribute is overridden by the glide.i18n.force\_index system property, which defaults to true.
|
## text_search_only
Value: true/false
| table\_name field
| Limits the tables listed to those that are searchable by text.
|
## time_zone_field
Value: name of field containing the time zone
| any schedule date/time field
| Specifies the field in the parent record that contains the reference time zone for this field.
|
## timeDimension
Value: true/false
| any field of date type (glide\_date\_time, glide\_date, due\_date, date, or datetime) in a table subclassed from the task table | If present or true, enables production of time dimension data for use by OLAP (to produce reports based on quarters, weeks, or other time periods).Note: OLAP functionality has been deprecated.
|
## tinymce_allow_all
Value: true/false
| HTML


## tree_picker
Value: true/false
| reference field with reference to a hierarchical table
| Displays the hierarchy of reference values in a tree display (such as locations).
|
## treeloader
Value: "datumTreeInit"
| Script


## trim_value
Value: true/false
| String


## ts_weight
Value: integer value
| any field
| Controls the relative importance of a match in the field for text search. See Control Match Relevance By Field.
|
## types
Value: list of valid element types separated by semicolons (";")
| field\_name field
| Limits the fields display to the specified types.
|
## ui_date
Value: true/false
| any date/time field
| Allows you to use the Date Picker in the form
|
## update_exempt
Value: true/false
| field on any table where `update_synch=true
Value: If present or true, you can change this field without skipping updates to the rest of the record. During software upgrades, the value of this field is preserved, while the rest of the record receives upgrades. By default, the Active field on a tracked table is treated as update\_exempt even if the attribute is not present. For information about update sets, see System update sets.
|
## update_synch_custom
Value: binary Java class name
| any table
| Specifies custom update producer (a Java class) that handles update set production for this table.
|
## update_synch
Value: true/false
| any table
| Indicates that changes in the table are tracked in update sets. Administrators cannot modify this attribute. To migrate data, use an instance-to-instance import.
|
## url_click_save
Value: true/false
| URL


## url_sanitize
Value: true/false
| URL


## use_document_viewer
Value: true/false
| any table
| If present or true, allows users to open supported attachments in a document viewer within the platform, rather than downloading the files directly to their own file system.
|
## use_workflow
Value: true/false
| any table that has delivery plans or uses workflow
| If present or true, causes workflow to be used instead of delivery plans.
|
## user_preference
Value: true/false
| any field
| If present or true, causes any user preferences to be used instead of the normal default value.
|
