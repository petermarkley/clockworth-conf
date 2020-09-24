#!/usr/bin/gjs

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;
const GObject = imports.gi.GObject;
const Pango = imports.gi.Pango;
const GdkPixbuf = imports.gi.GdkPixbuf;

const MAX_RECURSION_DEPTH = 100;
const PRIMARY_R = 0;
const PRIMARY_G = 0;
const PRIMARY_B = 0;

class cwconf {
	// Create the application itself
	constructor() {
		this.application = new Gtk.Application();
		
		// Connect 'activate' and 'startup' signals to the callback functions
		this.application.connect('activate', this._onActivate.bind(this));
		this.application.connect('startup', this._onStartup.bind(this));
	}

	// Callback function for 'activate' signal presents windows when active
	_onActivate() {
		this._window.present();
	}

	// Callback function for 'startup' signal builds the UI
	_onStartup() {
		this.loadDefault();
		this._buildUI();
	}
	
	_detSetState(isSelected,model,iter) {
		if (isSelected) {
			let path = this._tree.get_value(iter,6)
			if (path.length>0) {
				this._detPath.label = path+" \u2192";
				this._detPath.margin_end = 20;
				this._detPath.visible = true;
			} else {
				this._detPath.label = "";
				this._detPath.margin_end = 0;
				this._detPath.visible = false;
			}
			this._detLabel.label = this._tree.get_value(iter,1);
			this._detLabel.sensitive = true;
			this._detIsGroup.label = (this._tree.get_value(iter,0)?"[group]":"[event]");
			this._detIsGroup.margin_start = 12;
			this._detIsGroup.visible = true;
			this._detEnable.active = this._tree.get_value(iter,2);
			this._detEnable.sensitive = true;
			this._detEnableLabel.sensitive = true;
		} else {
			this._detPath.label = "";
			this._detPath.margin_end = 0;
			this._detPath.visible = false;
			this._detLabel.label = "(no selection)";
			this._detLabel.sensitive = false;
			this._detIsGroup.label = "";
			this._detIsGroup.margin_start = 0;
			this._detIsGroup.visible = false;
			this._detEnable.active = false;
			this._detEnable.sensitive = false;
			this._detEnableLabel.sensitive = false;
		}
	}
	
	_treeBarSetState(isSelected,model,iter) {
		if (isSelected) {
			//"add" button
			this._tb1.sensitive = true;
			//"remove" button
			this._tb2.sensitive = true;
			//"unindent" button
			if (model.iter_parent(iter)[0]) {
				this._tb3.sensitive = true;
			} else {
				this._tb3.sensitive = false;
			}
			//buttons pertaining to previous table row
			let prev = iter.copy();
			if (model.iter_previous(prev)) {
				//"move up" button
				this._tb5.sensitive = true;
				//"indent" button
				if (model.get_value(prev,0)) {
					this._tb4.sensitive = true;
				} else {
					this._tb4.sensitive = false;
				}
			} else {
				//"move up" button
				this._tb5.sensitive = false;
				//"indent" button
				this._tb4.sensitive = false;
			}
			//"move down" button
			let next = iter.copy();
			if (model.iter_next(next)) {
				this._tb6.sensitive = true;
			} else {
				this._tb6.sensitive = false;
			}
		} else {
			this._tb1.sensitive = true; //we can always add a new node, even if there's no selection
			this._tb2.sensitive = false;
			this._tb3.sensitive = false;
			this._tb4.sensitive = false;
			this._tb5.sensitive = false;
			this._tb6.sensitive = false;
		}
	}
	
	_seqBarSetState(isSelected,slot) {
		if (isSelected && slot > 0 && slot <= 10) {
			if (slot > 1) {
				this._sb1.sensitive = true;
			} else {
				this._sb1.sensitive = false;
			}
			if (slot < 10) {
				this._sb2.sensitive = true;
			} else {
				this._sb2.sensitive = false;
			}
		} else {
			this._sb1.sensitive = false;
			this._sb2.sensitive = false;
		}
	}
	
	_buildUI_tree(data, model, flat, parent, path, depth) {
		if (depth > MAX_RECURSION_DEPTH) {
			log("reached max recursion depth");
			this.application.quit();
			return false;
		}
		let iter1 = null;
		let iter2 = null;
		let label = (path.length>0?path+" \u2192 "+data.label:data.label);
		let viable = true;
		if (parent) viable = model.get_value(parent,2) && model.get_value(parent,3);
		switch (data.type) {
			case "group":
				iter1 = model.append(parent);
				model.set(iter1,[0,1,2,3,4,5,6,7],[true,data.label,data.enable,viable,0,label,path,-1]);
				for (let i=0; i < data.members.length; i++) {
					if (!this._buildUI_tree(data.members[i],model,flat,iter1,label,depth+1))
						return false;
				}
			break;
			case "event":
				iter1 = model.append(parent);
				iter2 = flat.append();
				this._iters_tree[this._iters_num] = iter1;
				this._iters_flat[this._iters_num] = iter2;
				model.set(iter1,[0,1,2,3,4,5,6,7],[false,data.label,data.enable,viable,data.sequence,label,path,this._iters_num]);
				flat.set(iter2,[0,1,2,3,4,5],[data.label,data.enable,viable,data.sequence,label,this._iters_num]);
				this._iters_num++;
			break;
		}
		return true;
	}
	
	// Build the application's UI
	_buildUI() {
		// Create the application window
		this._window = new Gtk.ApplicationWindow  ({
			application: this.application,
			title: "Clockworth Configurator",
			default_width: 1200,
			default_height: 800,
			border_width: 20,
			window_position: Gtk.WindowPosition.CENTER });
		this._window.set_icon( GdkPixbuf.Pixbuf.new_from_file( GLib.get_current_dir() + '/img/clockworth-icon-alpha-128px.png' ) );
		this._css   = new Gtk.CssProvider();
		this._css.load_from_data(
			".pane_header {font-size: 1.2em; letter-spacing: 2px;} "+
			".frame_inner {border-radius: 0px; border: 2px solid rgba("+PRIMARY_R+","+PRIMARY_G+","+PRIMARY_B+",0.25);}"+
			".frame_outer {border-radius: 5px; border: 1px solid rgba("+PRIMARY_R+","+PRIMARY_G+","+PRIMARY_B+",0.4);}"+
			".det_header {font-size: 1.2em; font-weight: bold;}"+
			".det_isgroup {font-size: 1.2em; font-style: italic;}");
		let style = null;
		
		this._grid = new Gtk.Grid ({
			row_spacing: 20,
			hexpand: true });
		this._image = new Gtk.Image ({ file: GLib.get_current_dir() + '/img/clockworth-photo-alpha-200px.png' });
		this._grid.attach (this._image, 0, 0, 1, 1);
		this._paned = Gtk.Paned.new(Gtk.Orientation.HORIZONTAL);
		this._paned.wide_handle = false;
		this._paned.position = (1200-20*2)/2;
		style = this._paned.get_style_context();
		style.add_class("frame_outer");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._grid.attach (this._paned, 0, 1, 1, 1);
		this._signalValve = {
			stat: 0,
			enm: {
				OPEN: 0,
				FLOW_RIGHT: 1,
				FLOW_LEFT: 2
			},
			slot: 0
		};
		
		//detail view
		this._detGrid = new Gtk.Grid({ hexpand: true });
		this._grid.attach (this._detGrid, 0, 2, 1, 1);
		this._detPath = new Gtk.Label({
			label: "",
			valign: Gtk.Align.END });
		this._detGrid.attach (this._detPath, 0, 0, 1, 1);
		this._detLabel = new Gtk.Label({
			label: "",
			valign: Gtk.Align.END });
		this._detGrid.attach (this._detLabel, 1, 0, 1, 1);
		style = this._detLabel.get_style_context();
		style.add_class("det_header");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._detIsGroup = new Gtk.Label({
			label: "",
			valign: Gtk.Align.END });
		this._detGrid.attach (this._detIsGroup, 2, 0, 1, 1);
		style = this._detIsGroup.get_style_context();
		style.add_class("det_isgroup");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._detEnableLabel = new Gtk.Label({
			label: "Enable",
			hexpand: true,
			halign: Gtk.Align.END,
			valign: Gtk.Align.END,
			margin_right: 15 });
		this._detGrid.attach (this._detEnableLabel, 3, 0, 1, 1);
		this._detEnable = new Gtk.Switch({
			halign: Gtk.Align.END,
			valign: Gtk.Align.END });
		this._detGrid.attach (this._detEnable, 4, 0, 1, 1);
		this._detSetState(false,null,null);
		this._detHeadRule = new Gtk.Separator({
			orientation: Gtk.Orientation.HORIZONTAL,
			margin_top: 5 });
		this._detGrid.attach (this._detHeadRule, 0, 1, 5, 1);
		
		//tree grid
		this._treeGrid = new Gtk.Grid({
			hexpand: true,
			margin: 5 });
		this._treeLabel = new Gtk.Label({
			label: "Chime Events",
			margin_left: 30,
			margin_right: 30,
			margin_bottom: 10 });
		style = this._treeLabel.get_style_context();
		style.add_class("pane_header");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._treeGrid.attach (this._treeLabel, 0, 0, 1, 1);
		this._paned.pack1 (this._treeGrid,true,false);
		
		//tree model
		this._tree = new Gtk.TreeStore();
		this._tree.set_column_types ([
			GObject.TYPE_BOOLEAN,   //is a group?
			GObject.TYPE_STRING,    //label
			GObject.TYPE_BOOLEAN,   //enable?
			GObject.TYPE_BOOLEAN,   //viable?
			GObject.TYPE_INT,       //sequence slot
			GObject.TYPE_STRING,    //path with label
			GObject.TYPE_STRING,    //path without label
			GObject.TYPE_INT ]);    //index to iterator in flat view
		this._tree_flat = new Gtk.ListStore();
		this._tree_flat.set_column_types ([
			GObject.TYPE_STRING,    //label
			GObject.TYPE_BOOLEAN,   //enable?
			GObject.TYPE_BOOLEAN,   //viable?
			GObject.TYPE_INT,       //sequence slot
			GObject.TYPE_STRING,    //path with label
			GObject.TYPE_INT ]);    //index to iterator in tree view
		this._iters_tree = Array();
		this._iters_flat = Array();
		this._iters_num = 0;
		for (let i=0; i < this.conf.events.length; i++) {
			this._buildUI_tree(this.conf.events[i],this._tree,this._tree_flat,null,"",0);
		}
		
		//tree view
		this._treeView = new Gtk.TreeView ({
			hexpand: true,
			model: this._tree,
			enable_grid_lines: true,
			enable_tree_lines: true,
			headers_visible: false });
		let col1 = new Gtk.TreeViewColumn({ expand: true });
		let tgl  = new Gtk.CellRendererToggle({ activatable: true });
		let txt  = new Gtk.CellRendererText({ editable: true });
		col1.pack_start(tgl,false);
		col1.pack_start(txt,true);
		col1.set_cell_data_func(tgl, function (col,cell,model,iter) {
			cell.active = model.get_value(iter,2);
			if (model.get_value(iter,3)) {
				cell.sensitive = true;
			} else {
				cell.sensitive = false;
			}
		});
		col1.set_cell_data_func(txt, function (col,cell,model,iter) {
			cell.text = model.get_value(iter,1);
			if (model.get_value(iter,0)) {
				cell.weight = Pango.Weight.BOLD;
			} else {
				cell.weight = Pango.Weight.NORMAL;
			}
			if (model.get_value(iter,2) && model.get_value(iter,3)) {
				cell.sensitive = true;
			} else {
				cell.sensitive = false;
			}
		});
		this._treeView.insert_column(col1,0);
		this._treeView.expand_all();
		this._tscroll = new Gtk.ScrolledWindow({
			min_content_height: 250 });
		style = this._tscroll.get_style_context();
		style.add_class("frame_inner");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._tscroll.add(this._treeView);
		this._treeGrid.attach (this._tscroll, 0, 1, 1, 1);
		this.treeSelection = this._treeView.get_selection();
		this.treeSelection.connect ('changed', this._onTreeSelectionChanged.bind(this));
		this.treeSelection.set_mode(Gtk.SelectionMode.SINGLE);
		
		//tree toolbar
		this._treeBar = new Gtk.Toolbar({
			hexpand: true,
			show_arrow: false });
		this._treeGrid.attach (this._treeBar, 0, 2, 1, 1);
		this._tb1 = new Gtk.ToolButton({
			icon_name: 'list-add',
			tooltip_text: "Add New",
			hexpand: true });
		this._tb1.homogenous = true;
		this._treeBar.insert(this._tb1,-1);
		this._tb1.connect('clicked',this._event_add.bind(this));
		this._ts1 = new Gtk.SeparatorToolItem({ draw: true });
		this._treeBar.insert(this._ts1,-1);
		this._tb2 = new Gtk.ToolButton({
			icon_name: 'list-remove',
			tooltip_text: "Remove",
			hexpand: true });
		this._tb2.homogenous = true;
		this._treeBar.insert(this._tb2,-1);
		this._tb2.connect('clicked',this._event_remove.bind(this));
		this._ts2 = new Gtk.SeparatorToolItem({ draw: true });
		this._treeBar.insert(this._ts2,-1);
		this._tb3 = new Gtk.ToolButton({
			icon_name: 'gtk-unindent',
			tooltip_text: "Move Out of Group",
			hexpand: true });
		this._tb3.homogenous = true;
		this._treeBar.insert(this._tb3,-1);
		this._tb3.connect('clicked',this._event_unindent.bind(this));
		this._ts3 = new Gtk.SeparatorToolItem({ draw: true });
		this._treeBar.insert(this._ts3,-1);
		this._tb4 = new Gtk.ToolButton({
			icon_name: 'gtk-indent',
			tooltip_text: "Move Into Group",
			hexpand: true });
		this._tb4.homogenous = true;
		this._treeBar.insert(this._tb4,-1);
		this._tb4.connect('clicked',this._event_indent.bind(this));
		this._ts4 = new Gtk.SeparatorToolItem({ draw: true });
		this._treeBar.insert(this._ts4,-1);
		this._tb5 = new Gtk.ToolButton({
			icon_name: 'go-up',
			tooltip_text: "Move Up",
			hexpand: true });
		this._tb5.homogenous = true;
		this._treeBar.insert(this._tb5,-1);
		this._tb5.connect('clicked',this._event_up.bind(this));
		this._ts5 = new Gtk.SeparatorToolItem({ draw: true });
		this._treeBar.insert(this._ts5,-1);
		this._tb6 = new Gtk.ToolButton({
			icon_name: 'go-down',
			tooltip_text: "Move Down",
			hexpand: true });
		this._tb6.homogenous = true;
		this._treeBar.insert(this._tb6,-1);
		this._tb6.connect('clicked',this._event_down.bind(this));
		this._treeBarSetState(false,null,null);
		
		//sequence grid
		this._seqGrid = new Gtk.Grid({
			hexpand: true,
			margin: 5 });
		this._seqLine = new Gtk.Grid({
			column_spacing: 10,
			halign: Gtk.Align.CENTER,
			margin_left: 30,
			margin_right: 30,
			margin_bottom: 10 });
		style = this._seqLine.get_style_context();
		style.add_class("pane_header");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._seqInfo = new Gtk.Image ({
			stock: 'gtk-info',
			tooltip_text: "Procedure in case two or more chime events \u201ccollide,\u201d i.e. match on the same minute.\n\nEach minute that the chime script executes, all ten slots are computed in sequence. During this time, only the last match from each slot will be played.\n\nOr, put another way:\n\nIf two matching events share a slot, the latter will replace the other. Otherwise, if they occupy different slots, they will both play in order." });
		this._seqLabel = new Gtk.Label({label: "Collision Sequence"});
		this._seqLine.attach (this._seqLabel, 0, 0, 1, 1);
		this._seqLine.attach (this._seqInfo, 1, 0, 1, 1);
		this._seqGrid.attach (this._seqLine, 0, 0, 1, 1);
		this._paned.pack2 (this._seqGrid,true,false);
		this._sscroll = new Gtk.ScrolledWindow({ 
			min_content_height: 250 });
		style = this._sscroll.get_style_context();
		style.add_class("frame_inner");
		style.add_provider(this._css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
		this._slots = new Gtk.Grid({ 
			row_spacing: 10,
			hexpand: true });
		this._sscroll.add(this._slots);
		this._seqGrid.attach (this._sscroll, 0, 1, 1, 1);
		
		//sequence view
		this.flatSelection = Array();
		this.flatFilters = Array();
		for (let i=1; i<=10; i++) {
			let div = new Gtk.Grid({
				row_spacing: 2 });
			if (i==1) {
				div.margin_top = 10;
			}
			this._slots.attach (div, 0, i-1, 1, 1);
			let label = new Gtk.Label({
				label: "Slot "+i,
				halign: Gtk.Align.START,
				expand: false,
				margin_left: 10 });
			div.attach (label, 0, 0, 1, 1);
			this.flatFilters[i] = this._tree_flat.filter_new(null);
			this.flatFilters[i].set_visible_func(function (model,iter) {
				if (model.get_value(iter,3) == i) {
					return true;
				} else {
					return false;
				}
			});
			let view = new Gtk.TreeView({
				hexpand: true,
				model: this.flatFilters[i],
				enable_grid_lines: false,
				enable_tree_lines: false,
				headers_visible: false,
				level_indentation: 0 });
			let col = new Gtk.TreeViewColumn({
				title: "Event",
				expand: true });
			let cell = new Gtk.CellRendererText();
			col.pack_start(cell,true);
			col.set_cell_data_func(cell, function (col,cell,model,iter) {
				cell.text = "\t"+model.get_value(iter,4);
				if (model.get_value(iter,1) && model.get_value(iter,2)) {
					cell.sensitive = true;
				} else {
					cell.sensitive = false;
				}
			});
			view.insert_column(col,0);
			view.expand_all();
			view.set_show_expanders(false);
			div.attach (view, 0, 1, 1, 1);
			this.flatSelection[i] = view.get_selection();
			this.flatSelection[i].connect ('changed', this._onFlatSelectionChanged.bind(this,i));
			this.flatSelection[i].set_mode(Gtk.SelectionMode.SINGLE);
		}
		
		//sequence toolbar
		this._seqBar = new Gtk.Toolbar({
			hexpand: true,
			show_arrow: false });
		this._seqGrid.attach (this._seqBar, 0, 2, 1, 1);
		this._sb1 = new Gtk.ToolButton({
			icon_name: 'go-up',
			tooltip_text: "Move to Previous Slot",
			hexpand: true });
		this._sb1.homogenous = true;
		this._seqBar.insert(this._sb1,-1);
		this._sb1.connect('clicked',this._event_prev.bind(this));
		this._ss1 = new Gtk.SeparatorToolItem({ draw: true });
		this._seqBar.insert(this._ss1,-1);
		this._sb2 = new Gtk.ToolButton({
			icon_name: 'go-down',
			tooltip_text: "Move to Next Slot",
			hexpand: true });
		this._sb2.homogenous = true;
		this._seqBar.insert(this._sb2,-1);
		this._sb2.connect('clicked',this._event_next.bind(this));
		this._seqBarSetState(false,0);
		
		this._window.add (this._grid);
		this._window.show_all();
	}
	
	loadDefault() {
		// get the contents of the json
		let [ok, contents] = GLib.file_get_contents( GLib.get_current_dir() + '/default.json' );
		if (ok) {
			this.conf = JSON.parse(ByteArray.toString(contents));
		}
	}
	
	//button functions
	_event_add() {
		print("add");
	}
	_event_remove() {
		print("remove");
	}
	_event_unindent() {
		print("unindent");
	}
	_event_indent() {
		print("indent");
	}
	_event_up() {
		print("up");
	}
	_event_down() {
		print("down");
	}
	_event_prev() {
		print("prev");
	}
	_event_next() {
		print("next");
	}
	
	//selection functions
	_onTreeSelectionChanged() {
		if (this._signalValve.stat != this._signalValve.enm.FLOW_LEFT) {
			//close signal valve from flat view
			this._signalValve.stat = this._signalValve.enm.FLOW_RIGHT;
			//get navigation data
			let [ isSelected, model, iter ] = this.treeSelection.get_selected();
			
			//update opposing selection
			let slot = 0;
			let flatSelected = false;
			if (isSelected) {
				slot = model.get_value(iter,4);
				let num = model.get_value(iter,7);
				for (let i=1; i<=10; i++) {
					if (num >= 0 && i == slot) {
						let [ok,iter_f] = this.flatFilters[i].convert_child_iter_to_iter(this._iters_flat[num]);
						if (ok) {
							this.flatSelection[i].select_iter(iter_f);
							flatSelected = true;
						} else {
							this.flatSelection[i].unselect_all();
						}
					} else {
						this.flatSelection[i].unselect_all();
					}
				}
			} else {
				for (let i=1; i<=10; i++) {
					this.flatSelection[i].unselect_all();
				}
			}
			
			//update detail view
			this._detSetState(isSelected,model,iter);
			
			//update toolbars
			this._treeBarSetState(isSelected,model,iter);
			this._seqBarSetState(flatSelected,slot);
			
			//open signal valve
			this._signalValve.stat = this._signalValve.enm.OPEN;
		}
	}
	_onFlatSelectionChanged(slot) {
		if (this._signalValve.stat == this._signalValve.enm.OPEN || (this._signalValve.stat == this._signalValve.enm.FLOW_LEFT && this._signalValve.slot == slot)) {
			//close signal valve from tree view
			this._signalValve.stat = this._signalValve.enm.FLOW_RIGHT;
			this._signalValve.slot = slot;
			//get navigation data
			let [ isSelected, model_f, iter_f ] = this.flatSelection[slot].get_selected();
			
			if (isSelected) {
				//update selection in other flat slots
				for (let i=1; i<=10; i++) {
					if (i != slot) {
						this.flatSelection[i].unselect_all();
					}
				}
				//update opposing selection
				let model = this.flatFilters[slot].get_model();
				let iter = this.flatFilters[slot].convert_iter_to_child_iter(iter_f);
				let num = model.get_value(iter,5);
				if (num >= 0) {
					this._treeView.expand_to_path(this._tree.get_path(this._iters_tree[num]));
					this.treeSelection.select_iter(this._iters_tree[num]);
				}
			} else {
				//on a signal from an empty flat selection, we may only unselect in tree view if no selection is found in a different flat slot
				let found = false;
				for (let i=1; i<=10; i++) {
					if (i != slot) {
						if (this.flatSelection[i].get_selected()[0]) {
							found = true;
						}
					}
				}
				if (!found) {
					this.treeSelection.unselect_all();
				}
			}
			
			//open signal valve
			this._signalValve.stat = this._signalValve.enm.OPEN;
		}
	}
};

// Run the application
let app = new cwconf ();
app.application.run (ARGV);

