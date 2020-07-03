define([
    'core/js/adapt',
    'core/js/views/componentView'
], function(Adapt, ComponentView) {

    var AssessmentResultsTotalAudioView = ComponentView.extend({

        events: {
            'click .audio-toggle': 'toggleAudio'
        },

        preRender: function () {
            this.model.setLocking('_isVisible', false);

            this.listenTo(Adapt, 'preRemove', function () {
                this.model.unsetLocking('_isVisible');
            });

            this.listenTo(this.model, {
                'change:_feedbackBand': this.addClassesToArticle,
                'change:body': this.render
            });

            this.model.checkIfAssessmentComplete();
        },

        postRender: function() {
            this.setReadyStatus();
            this.setupInviewCompletion('.component-inner', this.model.checkCompletion.bind(this.model));

            if (Adapt.audio && this.model.get('_audioAssessment')._isEnabled) {
              this.setupAudio();

              this.$el.on("onscreen", _.bind(this.onscreen, this));
              this.listenTo(Adapt, 'remove', this.removeListeners);
            }
        },

        removeListeners: function() {
            this.$el.off('onscreen');
        },

        setupAudio: function() {
          // Set vars
          this.audioChannel = this.model.get("_audioAssessment")._channel;
          this.elementId = this.model.get("_id");
          this.onscreenTriggered = false;

          // Autoplay
          if (Adapt.audio.autoPlayGlobal || this.model.get("_audioAssessment")._autoplay){
              this.canAutoplay = true;
          } else {
              this.canAutoplay = false;
          }

          // Autoplay once
          if (Adapt.audio.autoPlayOnceGlobal == false){
              this.autoplayOnce = false;
          } else if(Adapt.audio.autoPlayOnceGlobal || this.model.get("_audioAssessment")._autoPlayOnce){
              this.autoplayOnce = true;
          } else {
            this.autoplayOnce = false;
          }

          // Hide controls if set in JSON or if audio is turned off
          if (this.model.get('_audioAssessment')._showControls==false || Adapt.audio.audioClip[this.audioChannel].status==0){
              this.$('.audio-inner button').hide();
          }

          // Hide controls if set in JSON or if audio is turned off
          if (this.model.get('_audioAssessment')._showControls==false || Adapt.audio.audioClip[this.audioChannel].status==0){
              this.$('.audio-inner button').hide();
          }
        },

        onscreen: function(event, measurements) {
            var visible = this.model.get('_isVisible');
            var isOnscreenY = measurements.percentFromTop < Adapt.audio.triggerPosition && measurements.percentFromTop > 0;
            var isOnscreenX = measurements.percentInviewHorizontal == 100;
            var isOnscreen = measurements.onscreen;

            // Check for element coming on screen
            if (visible && isOnscreen && isOnscreenY && isOnscreenX && this.canAutoplay && this.onscreenTriggered == false) {
              // Check if audio is set to on
              if (Adapt.audio.audioClip[this.audioChannel].status == 1) {
                Adapt.trigger('audio:playAudio', this.model.get('audioFile'), this.elementId, this.audioChannel);
              }
              // Set to false to stop autoplay when onscreen again
              if (this.autoplayOnce) {
                this.canAutoplay = false;
              }
              // Set to true to stop onscreen looping
              this.onscreenTriggered = true;
            }
            // Check when element is off screen
            if (visible && isOnscreen == false) {
              this.onscreenTriggered = false;
              Adapt.trigger('audio:onscreenOff', this.elementId, this.audioChannel);
            }
        },

        toggleAudio: function(event) {
            if (event) event.preventDefault();
            Adapt.audio.audioClip[this.audioChannel].onscreenID = "";
            if ($(event.currentTarget).hasClass('playing')) {
                Adapt.trigger('audio:pauseAudio', this.audioChannel);
            } else {
                Adapt.trigger('audio:playAudio', this.model.get('audioFile'), this.elementId, this.audioChannel);
            }
        },

        /**
         * If there are classes specified for the feedback band, apply them to the containing article
         * This allows for custom styling based on the band the user's score falls into
         */
        addClassesToArticle: function(model, value) {
            if (!value || !value._classes) return;

            this.$el.parents('.article').addClass(value._classes);
        }

    }, {
        template: 'assessmentResultsTotalAudio'
    });

    return AssessmentResultsTotalAudioView;
});
