//


//Copyright (C) 2013 Gabriel Becker

/**
 * An interactive code cell which is rendered with HTML5 input widgets above the editor. Interacting with the controls changes the code that appears in the editor
**/



var IPython = (function (IPython){
    "use strict";
    var utils = IPython.utils;
    var key   = IPython.utils.keycodes;
    CodeMirror.modeURL = "/static/codemirror/mode/%N/%N.js";

    var IntCodeCell = function(kernel, options, controls) {
	        var options = options || {}
        this.kernel = kernel || null;
        this.code_mirror = null;
        this.input_prompt_number = null;
        this.collapsed = false;
        this.default_mode = 'python';
	this.widgets = [];
	this.widget_area = null;
        var cm_overwrite_options  = {
            extraKeys: {"Tab": "indentMore","Shift-Tab" : "indentLess",'Backspace':"delSpaceToPrevTabStop"},
            onKeyEvent: $.proxy(this.handle_codemirror_keyevent,this)
        };

        var arg_cm_options = options.cm_options || {};
        var cm_config = $.extend({},IntCodeCell.cm_default, arg_cm_options, cm_overwrite_options);

        var options = {};
        options.cm_config = cm_config;

        IPython.Cell.apply(this,[options]);

        var that = this;
        this.element.focusout(
            function() { that.auto_highlight(); }
        );
    };

    IntCodeCell.cm_default = {
            mode: 'python',
            theme: 'ipython',
            matchBrackets: true
    };


    IntCodeCell.prototype = new IPython.CodeCell();

    IntCodeCell.prototype.create_element = function () {
        IPython.Cell.prototype.create_element.apply(this, arguments);

        var cell =  $('<div></div>').addClass('cell border-box-sizing code_cell vbox');
        cell.attr('tabindex','2');

        this.celltoolbar = new IPython.CellToolbar(this);
	var controls = $('<div></div>').addClass('code_controls');
        var input = $('<div></div>').addClass('input hbox');
        var vbox = $('<div/>').addClass('vbox box-flex1')
        input.append($('<div/>').addClass('prompt input_prompt'));
        vbox.append(this.celltoolbar.element);
        var input_area = $('<div/>').addClass('input_area');
        this.code_mirror = CodeMirror(input_area.get(0), this.cm_config);
        $(this.code_mirror.getInputField()).attr("spellcheck", "false");
	vbox.append(controls);
        vbox.append(input_area);
        input.append(vbox);
        var output = $('<div></div>');
        cell.append(input).append(output);
        this.element = cell;
        this.output_area = new IPython.OutputArea(output, true);
	this.widget_area = controls;
        // construct a completer only if class exist
        // otherwise no print view
        if (IPython.Completer !== undefined)
        {
            this.completer = new IPython.Completer(this);
        }
    };

    IntCodeCell.prototype.toJSON = function () {
        var data = IPython.Cell.prototype.toJSON.apply(this);
        data.input = this.get_text();
        data.cell_type = 'interactivecode';
        if (this.input_prompt_number) {
            data.prompt_number = this.input_prompt_number;
        };
        var outputs = this.output_area.toJSON();
        data.outputs = outputs;
        data.language = 'python';
        data.collapsed = this.collapsed;
	data.widgets = this.widgets
        return data;
    };


    IntCodeCell.prototype.fromJSON = function(data){
	IPython.CodeCell.prototype.fromJSON.apply(this, arguments);
	if(data.cell_type === "interactivecode") {
            if (data.input !== undefined) {
                this.set_text(data.input);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                this.code_mirror.clearHistory();
                this.auto_highlight();
            }
            if (data.prompt_number !== undefined) {
                this.set_input_prompt(data.prompt_number);
            } else {
                this.set_input_prompt();
            };
            this.output_area.fromJSON(data.outputs);
            if (data.collapsed !== undefined) {
                if (data.collapsed) {
                    this.collapse();
                } else {
                    this.expand();
                };
            };

	    if(data.widgets !== undefined){
		this.widgets = data.widgets;
		var nwidg = data.widgets.length;
		var widget, wdata, widget_container, widget_label;
		for(var i = 0; i < nwidg; i++)
		{
		    wdata = data.widgets[i];
		    if(wdata.type === "slider")
		    {
			widget_container = $("<div></div>").addClass("widget_container hbox");
			widget_label = $("<span></span>").text(wdata.variable + ": ").addClass("widget_label");
			//widget = $("<input></input>").attr({type:"range", step:wdata.step, min:wdata.min, max:wdata.max, value:wdata.defaultvalue}).on("change", {variable:wdata.variable, linenum:wdata.linenum, index:i, cell:this}, this.doControl);
			widget = $("<input></input>").attr({type:"range", step:wdata.step, min:wdata.min, max:wdata.max}).on("change", {variable:wdata.variable, linenum:wdata.linenum, index:i, cell:this}, this.doControl);
			widget_container.append(widget_label);
			widget_container.append(widget);
			this.widget_area.append(widget_container);
		    }
		    
		}
	    }
	    
	}
    };
    
    IntCodeCell.prototype.doControl = function(event)
    {
	var dat = event.data;
	var that = dat.cell;	
//var widget = this.widget_area.children("div.widget_container")[dat.index].children("input");
	//var widget = $(this.widget_area).children("div.widget_container").children("input");
	//XXX widget is undefined
	var widget = $(that.widget_area).children("div.widget_container").children("input");
	var val = widget.val();
	var txt = dat.variable + " = " + val + ";";
	
	that.code_mirror.setLine(dat.linenum, txt);
	that.execute();

    };

    IPython.IntCodeCell = IntCodeCell;
    return IPython;
}(IPython));