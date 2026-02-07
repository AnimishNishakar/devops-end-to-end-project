pipeline {
    agent any

    environment {
        AWS_REGION = "ap-south-1"
        AWS_ACCOUNT_ID = "876178095025"
        ECR_REPO_NAME = "flask-app"
        ECR_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                dir('app') {
                    sh '''
                    docker build -t $ECR_REPO:$IMAGE_TAG .
                    '''
                }
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    sh '''
                    aws ecr get-login-password --region $AWS_REGION \
                    | docker login --username AWS --password-stdin $ECR_REPO
                    '''
                }
            }
        }
	
	stage('Push Image to ECR') {
            steps {
                sh '''
                docker push $ECR_REPO:$IMAGE_TAG
                '''
            }
        }
    	
	stage('Deploy Application') {
	    steps {
	        sh '''
	        docker stop flask-app || true
	        docker rm flask-app || true

	        docker pull $ECR_REPO:$IMAGE_TAG

	        docker run -d \
	          --name flask-app \
	          -p 5000:5000 \
	          --restart always \
	          $ECR_REPO:$IMAGE_TAG
	        '''
	    }
	}
	stage('Blue-Green Deploy') {
	    steps {
	        sh '''
	        set -e

	        IMAGE=$ECR_REPO:$IMAGE_TAG

	        # Detect live container
	        if docker ps --format '{{.Names}}' | grep -q flask-blue; then
	            LIVE="blue"
	            NEW="green"
	            NEW_PORT=5002
	        else
	            LIVE="green"
	            NEW="blue"
	            NEW_PORT=5001
	        fi

	        echo "Live container: $LIVE"
	        echo "Deploying new container: $NEW"

	        # Clean old NEW container if exists (important fix)
	        docker stop flask-$NEW || true
	        docker rm flask-$NEW || true

	        # Run new container
	        docker run -d --name flask-$NEW -p $NEW_PORT:5000 $IMAGE

	        echo "Waiting for new container to be ready..."
	        sleep 10

	        # Switch traffic
	        sudo sed -i "s/flask-$LIVE/flask-$NEW/" /etc/nginx/conf.d/flask.conf
	        sudo nginx -s reload

	        # Stop old container
	        docker stop flask-$LIVE || true
	        docker rm flask-$LIVE || true

	        echo "Blue-Green deployment successful"
	        '''
     	    }   
      	}	
    }	

    post {
        success {
            echo "Pipeline completed successfully 🚀"
        }
        failure {
            echo "Pipeline failed ❌"
        }
    }
}
