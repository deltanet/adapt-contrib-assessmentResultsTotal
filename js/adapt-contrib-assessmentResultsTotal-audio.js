define([
  'core/js/adapt',
  './assessmentResultsTotalAudioModel',
  './assessmentResultsTotalAudioView'
], function(Adapt, AssessmentResultsTotalAudioModel, AssessmentResultsTotalAudioView) {

  return Adapt.register("assessmentResultsTotalAudio", {
    model: AssessmentResultsTotalAudioModel,
    view: AssessmentResultsTotalAudioView
  });

});
