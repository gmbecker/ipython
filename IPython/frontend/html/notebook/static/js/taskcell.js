
var IPython = (function (IPython) {
/*
    // TextCell base class
    var key = IPython.utils.keycodes;

    var TaskCell = function () {
        this.code_mirror_mode = this.code_mirror_mode || 'htmlmixed';
        IPython.Cell.apply(this, arguments);
        this.rendered = false;
        this.cell_type = this.cell_type || 'text';
    };


    TaskCell.prototype = new IPython.Cell();


    TaskCell.prototype.create_element = function () {
        var cell = $("<div>").addClass('cell text_cell border-box-sizing');
        cell.attr('tabindex','2');
        var input_area = $('<div/>').addClass('text_cell_input border-box-sizing');
        this.code_mirror = CodeMirror(input_area.get(0), {
            indentUnit : 4,
            mode: this.code_mirror_mode,
            theme: 'default',
            value: this.placeholder,
            readOnly: this.read_only,
            lineWrapping : true,
            extraKeys: {"Tab": "indentMore","Shift-Tab" : "indentLess"},
            onKeyEvent: $.proxy(this.handle_codemirror_keyevent,this)
        });
        // The tabindex=-1 makes this div focusable.
        var render_area = $('<div/>').addClass('text_cell_render border-box-sizing').
            addClass('rendered_html').attr('tabindex','-1');
        cell.append(input_area).append(render_area);
        this.element = cell;
    };


    TaskCell.prototype.bind_events = function () {
        IPython.Cell.prototype.bind_events.apply(this);
        var that = this;
        this.element.keydown(function (event) {
            if (event.which === 13 && !event.shiftKey) {
                if (that.rendered) {
                    that.edit();
                    return false;
                };
            };
        });
        this.element.dblclick(function () {
            that.edit();
        });
    };


    TaskCell.prototype.handle_codemirror_keyevent = function (editor, event) {
        // This method gets called in CodeMirror's onKeyDown/onKeyPress
        // handlers and is used to provide custom key handling. Its return
        // value is used to determine if CodeMirror should ignore the event:
        // true = ignore, false = don't ignore.
        
        if (event.keyCode === 13 && (event.shiftKey || event.ctrlKey)) {
            // Always ignore shift-enter in CodeMirror as we handle it.
            return true;
        }
        return false;
    };


    TaskCell.prototype.select = function () {
        IPython.Cell.prototype.select.apply(this);
        var output = this.element.find("div.text_cell_render");
        output.trigger('focus');
    };


    TaskCell.prototype.unselect = function() {
        // render on selection of another cell
        this.render();
        IPython.Cell.prototype.unselect.apply(this);
    };


    TaskCell.prototype.edit = function () {
        if ( this.read_only ) return;
        if (this.rendered === true) {
            var text_cell = this.element;
            var output = text_cell.find("div.text_cell_render");  
            output.hide();
            text_cell.find('div.text_cell_input').show();
            this.code_mirror.refresh();
            this.code_mirror.focus();
            // We used to need an additional refresh() after the focus, but
            // it appears that this has been fixed in CM. This bug would show
            // up on FF when a newly loaded markdown cell was edited.
            this.rendered = false;
            if (this.get_text() === this.placeholder) {
                this.set_text('');
                this.refresh();
            }
        }
    };


    // Subclasses must define render.
    TaskCell.prototype.render = function () {};


    TaskCell.prototype.get_text = function() {
        return this.code_mirror.getValue();
    };


    TaskCell.prototype.set_text = function(text) {
        this.code_mirror.setValue(text);
        this.code_mirror.refresh();
    };


    TaskCell.prototype.get_rendered = function() {
        return this.element.find('div.text_cell_render').html();
    };


    TaskCell.prototype.set_rendered = function(text) {
        this.element.find('div.text_cell_render').html(text);
    };


    TaskCell.prototype.at_top = function () {
        if (this.rendered) {
            return true;
        } else {
            return false;
        }
    };


    TaskCell.prototype.at_bottom = function () {
        if (this.rendered) {
            return true;
        } else {
            return false;
        }
    };


    TaskCell.prototype.fromJSON = function (data) {
        IPython.Cell.prototype.fromJSON.apply(this, arguments);
        if (data.cell_type === this.cell_type) {
            if (data.source !== undefined) {
                this.set_text(data.source);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                this.code_mirror.clearHistory();
                this.set_rendered(data.rendered || '');
                this.rendered = false;
                this.render();
            }
        }
    };


    TaskCell.prototype.toJSON = function () {
        var data = IPython.Cell.prototype.toJSON.apply(this);
        data.cell_type = this.cell_type;
        data.source = this.get_text();
        return data;
    };
*/

   // TaskCell

    var TaskCell = function () {
        this.placeholder = "This is a Task cell";
        this.code_mirror_mode = 'rst';
        IPython.TextCell.apply(this, arguments);
        this.cell_type = 'task';
        var that = this

        this.element.focusout(
                function() { that.auto_highlight(); }
            );
    };


    TaskCell.prototype = new IPython.TextCell();

    TaskCell.prototype.auto_highlight = function () {
        this._auto_highlight(IPython.config.raw_cell_highlight);
    };

    TaskCell.prototype.render = function () {
        this.rendered = true;
        this.edit();
    };


    TaskCell.prototype.handle_codemirror_keyevent = function (editor, event) {
        // This method gets called in CodeMirror's onKeyDown/onKeyPress
        // handlers and is used to provide custom key handling. Its return
        // value is used to determine if CodeMirror should ignore the event:
        // true = ignore, false = don't ignore.

        var that = this;
        if (event.which === key.UPARROW && event.type === 'keydown') {
            // If we are not at the top, let CM handle the up arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_top()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        } else if (event.which === key.DOWNARROW && event.type === 'keydown') {
            // If we are not at the bottom, let CM handle the down arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_bottom()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        };
        return false;
    };


    TaskCell.prototype.select = function () {
        IPython.Cell.prototype.select.apply(this);
        this.code_mirror.refresh();
        this.code_mirror.focus();
    };


    TaskCell.prototype.at_top = function () {
        var cursor = this.code_mirror.getCursor();
        if (cursor.line === 0 && cursor.ch === 0) {
            return true;
        } else {
            return false;
        }
    };


    TaskCell.prototype.at_bottom = function () {
        var cursor = this.code_mirror.getCursor();
        if (cursor.line === (this.code_mirror.lineCount()-1) && cursor.ch === this.code_mirror.getLine(cursor.line).length) {
            return true;
        } else {
            return false;
        }
    };

    TaskCell.prototype.set_text = function(text) {
        this.code_mirror.setValue(text);
        this.code_mirror.refresh();
    };


    TaskCell.prototype.fromJSON = function (data) {
        IPython.Cell.prototype.fromJSON.apply(this, arguments);
        if (data.cell_type === this.cell_type) {
            if (data.cells !== undefined) {
                this.set_text("A task cell.");//A task containing " + length(data.cells) + " cells");
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                this.code_mirror.clearHistory();
                this.set_rendered(data.rendered || '');
                this.rendered = false;
                this.render();
            }
        }
    };


    IPython.TaskCell = TaskCell;
    

    return IPython;

}(IPython));