define([
    'core/js/adapt',
    'core/js/views/componentView'
], function(Adapt, ComponentView) {

    var AssessmentResultsTotalAudio = ComponentView.extend({

        events: {
            'click .audio-toggle': 'toggleAudio'
        },

        preRender: function () {
            this.audioIsEnabled = false;

            if (Adapt.course.get('_audio') && Adapt.course.get('_audio')._isEnabled && this.model.has('_audioAssessment') && this.model.get('_audioAssessment')._isEnabled) {
              this.setupAudio();
              this.audioIsEnabled = true;
            }

            this.setupEventListeners();
            this.setupModelResetEvent();
            this.checkIfVisible();
        },

        setupAudio: function() {
          // Set vars
          this.audioChannel = this.model.get("_audioAssessment")._channel;
          this.elementId = this.model.get("_id");
          this.audioFile = this.model.get("_audioAssessment")._media.src;

          this.onscreenTriggered = false;

          // Autoplay
          if(Adapt.audio.autoPlayGlobal || this.model.get("_audioAssessment")._autoplay){
              this.canAutoplay = true;
          } else {
              this.canAutoplay = false;
          }

          // Autoplay once
          if(Adapt.audio.autoPlayOnceGlobal == false){
              this.autoplayOnce = false;
          } else if(Adapt.audio.autoPlayOnceGlobal || this.model.get("_audioAssessment")._autoPlayOnce){
              this.autoplayOnce = true;
          } else {
            this.autoplayOnce = false;
          }

          // Hide controls if set in JSON or if audio is turned off
          if(this.model.get('_audioAssessment')._showControls==false || Adapt.audio.audioClip[this.audioChannel].status==0){
              this.$('.audio-inner button').hide();
          }
          this.$el.on("onscreen", _.bind(this.onscreen, this));
        },

        checkIfVisible: function() {
            var wasVisible = this.model.get("_isVisible");
            var isVisibleBeforeCompletion = this.model.get("_isVisibleBeforeCompletion") || false;

            var isVisible = wasVisible && isVisibleBeforeCompletion;

            var assessmentArticleModels = Adapt.assessment.get();
            if (assessmentArticleModels.length === 0) return;

            var isComplete = this.isComplete();

            if (!isVisibleBeforeCompletion) isVisible = isVisible || isComplete;

            this.model.set('_isVisible', true, {pluginName: "assessmentResultsTotalAudio"});

            // if assessment(s) already complete then render
            if (isComplete) this.onAssessmentComplete(Adapt.assessment.getState());
        },

        isComplete: function() {
            var isComplete = false;

            var assessmentArticleModels = Adapt.assessment.get();
            if (assessmentArticleModels.length === 0) return;

            for (var i = 0, l = assessmentArticleModels.length; i < l; i++) {
                var articleModel = assessmentArticleModels[i];
                var assessmentState = articleModel.getState();
                isComplete = assessmentState.isComplete;
                if (!isComplete) break;
            }

            if (!isComplete) {
                this.model.reset("hard", true);
            }

            return isComplete;
        },

        setupModelResetEvent: function() {
            if (this.model.onAssessmentsReset) return;
            this.model.onAssessmentsReset = function(state) {
                this.reset('hard', true);
            };
            this.model.listenTo(Adapt, 'assessments:reset', this.model.onAssessmentsReset);
        },

        postRender: function() {
            this.setReadyStatus();
            this.setupInviewCompletion('.component-inner', this.checkCompletion.bind(this));
        },
        setupEventListeners: function() {
            this.listenTo(Adapt, 'assessment:complete', this.onAssessmentComplete);
            this.listenToOnce(Adapt, 'remove', this.onRemove);
        },

        removeEventListeners: function() {;
            this.stopListening(Adapt, 'assessment:complete', this.onAssessmentComplete);
            this.stopListening(Adapt, 'remove', this.onRemove);
            this.$el.off('onscreen');
        },

        onAssessmentComplete: function(state) {
            this.model.set( {
                _state: state,
                isPass: state.isPass
            });

            this.setFeedbackBand(state);

            //show feedback component
            this.render();
            this.setFeedbackBand(state);

            this.setFeedbackText();
        },

        checkCompletion: function() {
            if (this.model.get('_setCompletionOn') === 'pass' && !this.model.get('isPass')) {
                return;
            }

            this.setCompletionStatus();
        },

        onscreen: function(event, measurements) {
            var visible = this.model.get('_isVisible');
            var isOnscreenY = measurements.percentFromTop < Adapt.audio.triggerPosition && measurements.percentFromTop > 0;
            var isOnscreenX = measurements.percentInviewHorizontal == 100;
            var isOnscreen = measurements.onscreen;

            // Check for element coming on screen
            if (visible && isOnscreenY && isOnscreenX && this.canAutoplay && this.onscreenTriggered == false) {
              // Check if audio is set to on
              if (Adapt.audio.audioClip[this.audioChannel].status == 1) {
                Adapt.trigger('audio:playAudio', this.audioFile, this.elementId, this.audioChannel);
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
                Adapt.trigger('audio:playAudio', this.audioFile, this.elementId, this.audioChannel);
            }
        },

        setFeedbackBand: function(state) {
            var scoreProp = state.isPercentageBased ? 'scoreAsPercent' : 'score';
            var bands = _.sortBy(this.model.get('_bands'), '_score');

            for (var i = (bands.length - 1); i >= 0; i--) {
                var isScoreInBandRange =  (state[scoreProp] >= bands[i]._score);
                if (!isScoreInBandRange) continue;

                this.model.set('_feedbackBand', bands[i]);
                break;
            }
        },

        setFeedbackText: function() {
            var feedbackBand = this.model.get('_feedbackBand');

            // ensure any handlebars expressions in the .feedback are handled...
            var feedback = feedbackBand ? Handlebars.compile(feedbackBand.feedback)(this.model.toJSON()) : '';

            this.model.set({
                feedback: feedback,
                body: this.model.get('_completionBody'),
                instruction: feedbackBand.instruction
            });

            if (this.audioIsEnabled) {
                this.audioFile = feedbackBand._audio.src;
            }
        },

        onRemove: function() {
            this.removeEventListeners();
        }

    });

    Adapt.register("assessmentResultsTotalAudio", AssessmentResultsTotalAudio);

});
