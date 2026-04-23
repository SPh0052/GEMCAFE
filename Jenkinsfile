pipeline {
    agent any
    environment {
        COMPOSE_PATH = '/home/ubuntu/cicd/develop-gemcafe'
        MATTERMOST_WEBHOOK = 'https://meeting.ssafy.com/hooks/e58i93piptd9jkfk819zcnjknh'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM',
                    branches: [[name: '*/develop-gemcafe']],
                    userRemoteConfigs: [[
                        url: 'https://lab.ssafy.com/s14-final/S14P31S307.git',
                        credentialsId: 'gitlab'
                    ]]
                ])
            }
        }
        stage('Build') {
            steps {
                sh """
                    cd ${COMPOSE_PATH}
                    docker compose build
                """
            }
        }
        stage('Deploy') {
            steps {
                sh """
                    cd ${COMPOSE_PATH}
                    docker compose down --remove-orphans || true
                    docker compose up -d
                    docker image prune -f
                """
            }
        }
    }
    post {
        success {
            sh """
                PUSHER=\$(git log -1 --pretty=format:'%an' 2>/dev/null || echo '알 수 없음')
                curl -X POST -H 'Content-type: application/json' \\
                --data "{
                    \\"text\\": \\"### ✅ develop-gemcafe 배포 성공\\n| 항목 | 내용 |\\n|---|---|\\n| Push한 사람 | \$PUSHER |\\n| 브랜치 | develop-gemcafe |\\n| 빌드 번호 | #${BUILD_NUMBER} |\\n| 소요 시간 | ${currentBuild.durationString} |\\n| 로그 | ${BUILD_URL} |\\"
                }" \\
                ${MATTERMOST_WEBHOOK}
            """
        }
        failure {
            sh """
                PUSHER=\$(git log -1 --pretty=format:'%an' 2>/dev/null || echo '알 수 없음')
                curl -X POST -H 'Content-type: application/json' \\
                --data "{
                    \\"text\\": \\"### ❌ develop-gemcafe 배포 실패\\n| 항목 | 내용 |\\n|---|---|\\n| Push한 사람 | \$PUSHER |\\n| 브랜치 | develop-gemcafe |\\n| 빌드 번호 | #${BUILD_NUMBER} |\\n| 확인 | ${BUILD_URL} |\\"
                }" \\
                ${MATTERMOST_WEBHOOK}