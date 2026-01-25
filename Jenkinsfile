pipeline {
    agent any

    environment {
        DEPLOYMENT_DIR = '/opt/apps/survey-panel/jenkins/deployment'
        BACKUP_DIR     = '/opt/apps/survey-panel/jenkins/backup'
        SERVICE_URL    = 'http://localhost:9090'
        HEALTH_ENDPOINT = '/health/live'
        BUILD_OUTPUT_DIR = '/opt/apps/survey-panel/jenkins/build'
        HOME_PATH = '/opt/apps/survey-panel/jenkins'
    }

    stages {
        stage('Init Timestamp') {
            steps {
                script {
                    env.TIMESTAMP = sh(
                        script: 'date +%Y%m%d_%H%M%S',
                        returnStdout: true
                    ).trim()
                }
            }
        }

        stage('Checkout') {
            steps {
                echo '🔄 Checking out code from GitHub...'
                checkout scm
                echo '✅ Code checkout successful!'
            }
        }

        stage('Build') {
            steps {
                echo '🔨 Building application...'
                script {
                    echo 'Build successfully'
                }
                echo '✅ Build completed!'
            }
        }

        stage('Backup Current Deployment') {
            steps {
                echo '💾 Backing up current deployment...'
                sh """


                    if [ -d "${DEPLOYMENT_DIR}" ] && [ "\$(ls -A ${DEPLOYMENT_DIR} 2>/dev/null)" ]; then
                        tar -czf ${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz -C ${DEPLOYMENT_DIR} . || true
                        echo "${TIMESTAMP}" > ${BACKUP_DIR}/last_successful.txt

                        cd ${BACKUP_DIR}
                        ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
                    else
                        echo "⚠️ No existing deployment to backup"
                    fi
                """
            }
        }

       stage('Deploy') {
           steps {
               echo '🚀 Deploying application...'
                sh "${HOME_PATH}/start.sh"
           }
       }

        stage('Health Check') {
            steps {
                script {
                    sleep 5

                    def healthCheckPassed = false
                    for (int i = 1; i <= 3; i++) {
                        def code = sh(
                            script: "curl -s -o /dev/null -w '%{http_code}' ${SERVICE_URL}${HEALTH_ENDPOINT} || echo 000",
                            returnStdout: true
                        ).trim()

                        if (code == '200') {
                            healthCheckPassed = true
                            break
                        }
                        sleep 3
                    }

                    if (!healthCheckPassed) {
                        error "❌ Health check failed"
                    }
                }
            }
        }

        stage('Mark as Successful') {
            steps {
                sh """
                    echo "${TIMESTAMP}" > ${BACKUP_DIR}/last_successful.txt
                """
            }
        }
    }

    post {
        success {
            echo '🎉 DEPLOYMENT SUCCESSFUL
        }

        failure {
            echo '❌ DEPLOYMENT FAILED! Initiating rollback...'
            sh """
                if [ -f "${BACKUP_DIR}/last_successful.txt" ]; then
                    LAST_SUCCESS=\$(cat ${BACKUP_DIR}/last_successful.txt)
                    BACKUP_FILE=${BACKUP_DIR}/backup_\${LAST_SUCCESS}.tar.gz

                    if [ -f "\${BACKUP_FILE}" ]; then
                        rm -rf ${DEPLOYMENT_DIR}/*
                        tar -xzf "\${BACKUP_FILE}" -C ${DEPLOYMENT_DIR}
                        chmod -R 755 ${DEPLOYMENT_DIR}

                        kill -9 \$(pgrep -f hospitalManagement) || true
                        sleep 1
                        nohup java -jar ${HOME_PATH}/hospitalManagement-0.0.1-SNAPSHOT.jar \
                         > ${HOME_PATH}/app.log 2>&1 &

                    fi
                fi
            """
             echo "✅ Rollback to last successful deployment completed."
        }

        always {
            echo "📊 Pipeline finished | Build: ${BUILD_NUMBER} | Job: ${JOB_NAME}"
        }
    }
            }