(function () {

'use strict';

angular.module('OpenSlidesApp.motions.projector', [
    'OpenSlidesApp.motions',
    'OpenSlidesApp.motions.motionservices',
    'OpenSlidesApp.motions.motionBlockProjector',
])

.config([
    'slidesProvider',
    function(slidesProvider) {
        slidesProvider.registerSlide('motions/motion', {
            template: 'static/templates/motions/slide_motion.html',
        });
    }
])

.controller('SlideMotionCtrl', [
    '$scope',
    'Motion',
    'MotionChangeRecommendation',
    'ChangeRecommendationView',
    'User',
    function($scope, Motion, MotionChangeRecommendation, ChangeRecommendationView, User) {
        // Attention! Each object that is used here has to be dealt on server side.
        // Add it to the coresponding get_requirements method of the ProjectorElement
        // class.
        var motionId = $scope.element.id;
        $scope.mode = $scope.element.mode || 'original';

        User.bindAll({}, $scope, 'users');

        $scope.$watch(function () {
            return Motion.lastModified(motionId);
        }, function () {
            $scope.motion = Motion.get(motionId);
            $scope.viewChangeRecommendations.setVersion($scope.motion, $scope.motion.active_version);
        });

        // Change recommendation viewing
        $scope.viewChangeRecommendations = ChangeRecommendationView;
        $scope.viewChangeRecommendations.initProjector($scope, Motion.get(motionId), $scope.mode);
    }
]);

}());
