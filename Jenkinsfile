pipeline {
    agent any

    stages {
        stage('Stage 1: Checkout') {
            steps {
                echo '✅ Checking out code from GitHub...'
                checkout scm
                echo '✅ Code checkout successful!'
            }
        }

        stage('Stage 2: Environment Info') {
            steps {
                echo '📋 Displaying environment information...'
                sh 'pwd'
                sh 'ls -la'
                sh 'echo "Build Number: ${BUILD_NUMBER}"'
                sh 'echo "Job Name: ${JOB_NAME}"'
                echo '✅ Environment info displayed!'
            }
        }

        stage('Stage 3: Test Build') {
            steps {
                echo '🔨 Running test build...'
                sh 'echo "This is where your build commands would go"'
                sh 'echo "Example: mvn clean install, npm install, etc."'
                echo 'Test build completed!'
            }
        }

        stage('Stage 4: Test Deployment') {
            steps {
                echo '🚀 Running test deployment...'
                sh 'echo "This is where your deployment commands would go"'
                sh 'echo "Example: scp, ssh, docker deploy, etc."'
                echo '✅ Test deployment completed!'
            }
        }
    }

    post {
        success {
            echo '🎉 ✅ Pipeline completed successfully!'
            echo 'All stages passed! Your Jenkins setup is working perfectly!'
        }
        failure {
            echo '❌ Pipeline failed!'
            echo 'Check the console output above for errors.'
        }
        always {
            echo '📊 Pipeline execution finished.'
        }
    }
}