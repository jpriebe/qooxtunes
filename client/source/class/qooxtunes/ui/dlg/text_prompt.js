qx.Class.define("qooxtunes.ui.dlg.text_prompt",
{
    extend : qooxtunes.ui.dlg.standard,

    type : 'singleton',

    construct : function ()
    {
        this.base(arguments, "qooxtunes");
        this.init ();
    },

    statics : {

        go : function (msg, value, input_callback, ok_callback, cancel_callback)
        {
            var dlg = qooxtunes.ui.dlg.text_prompt.getInstance();

            dlg.ok_callback = ok_callback;

            dlg.input_callback = input_callback;
            dlg.ok_callback = ok_callback;
            dlg.cancel_callback = cancel_callback;
        
            dlg.lb1.setValue(msg);
            dlg.tf1.setValue(value);
            dlg.btn_ok.setEnabled (true);
            
            dlg.open ();
        }
    },

    members : {

        // Event handlers {{{
        on_tf1_keypress : function (e)
        {
            if (e.getKeyIdentifier().toLowerCase() == 'enter')
            {
                this.on_btn_ok_execute (null);
            }
        },
            
        on_tf1_input : function (e)
        {
            if (this.input_callback == null)
            {
                return;
            }

            var retval = this.input_callback(this.tf1.getValue());

            if (this.btn_ok.getEnabled() != retval)
            {
                this.btn_ok.setEnabled(retval);
            }
        },

        on_btn_ok_execute : function ()
        {
            // it's possible we'll get called when the button is not enabled
            // (enter key in the text field)
            if (!this.btn_ok.getEnabled()) 
            {
                return;
            }
        
            this.close();
        
            if (this.ok_callback != null)
            {
                this.ok_callback(this.tf1.getValue());
            }
        },
        
        on_btn_cancel_execute : function ()
        {
            this.close();
        
            if (this.cancel_callback != null)
            {
                this.cancel_callback();
            }
        },
        
        /// }}}
        
        init : function ()
        {
            this.set ({width: 300, height: 150});
        
            this.lb1 = new qx.ui.basic.Label('');
                        this.add (this.lb1, {left: 8, top: 8, right: 8});
        
            this.tf1 = new qx.ui.form.TextField();
            this.tf1.set ({width : null});
            this.tf1.addListener("input", this.on_tf1_input, this);
            this.tf1.addListener("keypress", this.on_tf1_keypress, this);

            this.add (this.tf1, {left: 8, top: 32, right: 8});
               
            var bl1 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));
            bl1.set ({height : 32});
        
            this.btn_ok = new qx.ui.form.Button(this.tr ("OK"));
            this.btn_ok.set ({ height : 32, width : 100 });
            this.btn_ok.addListener("execute", this.on_btn_ok_execute, this);

            bl1.add(this.btn_ok);
    
            this.btn_cancel = new qx.ui.form.Button(this.tr ("Cancel"));
            this.btn_cancel.set ({ height : 32, width : 100 });
            this.btn_cancel.addListener("execute", this.on_btn_cancel_execute, this);

            bl1.add(this.btn_cancel);
    
            this.add (bl1, {left: 8, right: 8, bottom: 8});

            this.addListener ('appear', function () {
                this.tf1.focus ();
                this.tf1.setTextSelection (0);
                // initialize button status
                this.on_tf1_input();
            }, this);
        }
        

    }
});
