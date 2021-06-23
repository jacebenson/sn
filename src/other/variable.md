---
id: attributes-variable
title: Variable Attributes
---

## Overview


A list of all the variable attributes that could be found here on the
[docs](https://docs.servicenow.com/bundle/jakarta-it-service-management/page/product/service-catalog-management/reference/variable-attributes.html#variable-attributes).

## glide_list

Value: `true/false`\
Target Variable: List collector\
Changes the list collector interface from slushbucket to glide list.
## is_searchable_choice

Value: `true/false`\
Target Variable: Lookup select box,Select box\
If set to true, allows you to search and select the required value for the variable.
## max_length

Value: `true/false`
Target Variable: Single-line text,Wide single-line text\
Sets the maximum character length. For example, if `max_length=200`, the maximum value for `max_length` is 4000.
## max_unit

Value: `days/hours/minutes/seconds`\
Target Variable: Duration
Sets the maximum unit of time for the duration.
## no_filter

Value: `true/false`\
Target Variable: List Collector\
Hides the filter fields that appear above a list collector.
## ref_ac_columns

Value: `field;field`\
Target Variable: Reference\
Specifies the columns whose display values appear in an auto completion list in addition to the name. Separate column names with a semi-colon.
## ref_ac_order_by

Value: `field`\
Target Variable: Reference\
Specifies the column that is used to sort the auto completion list.
## ref_auto_completer

Value: `JavaScript class name`\
Target Variable: Reference\ 
Specifies the name of a JavaScript class (client-side) that creates the list for auto completion choices.
  
  - AJAXReferenceCompleter
  - AJAXTableCompleter
  - AJAXReferenceChoice
  
## ref_qual_elements
Value: `field;field`\
Target Variable: Lookup multiple choice,Lookup select box,List Collector
A list of fields to be sent back to the server to get an updated reference. Attribute behavior is specific to the service catalog desktop. Probably doesnt work on service portal.

## ref_ac_columns_search
Value: `true`\
Allows you to search the columns dictated