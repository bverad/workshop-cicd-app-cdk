import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';


interface ConsumerProps extends StackProps {
  ecrRepository: ecr.Repository;
}


export class PipelineCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: ConsumerProps) {
    super(scope, id, props);

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'cicd_pipeline',
      crossAccountKeys: false,
    });

    const codeBuild = new codebuild.PipelineProject(this, 'CodeBuild', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_test.yml'),

    });

    const dockerBuild = new codebuild.PipelineProject(this, 'DockerBuild', {
      environmentVariables: {
        IMAGE_TAG: { value: 'latest' },
        IMAGE_REPO_URI: { value: props.ecrRepository.repositoryUri },
        AWS_DEFAULT_REGION: { value: process.env.CDK_DEFAULT_REGION },
      },
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_docker.yml'),
    });

    const dockerBuildRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:GetRepositoryPolicy',
        'ecr:DescribeRepositories',
        'ecr:ListImages',
        'ecr:DescribeImages',
        'ecr:BatchGetImage',
        'ecr:InitiateLayerUpload',
        'ecr:UploadLayerPart',
        'ecr:CompleteLayerUpload',
        'ecr:PutImage',
      ],
    });

    dockerBuild.addToRolePolicy(dockerBuildRolePolicy);


    // Definir los artefactos del pipeline
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();
    const unitTestOutput = new codepipeline.Artifact();
    const dockerBuildOutput = new codepipeline.Artifact();



    // Definir la acción de origen para GitHub
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'source',
      owner: 'bverad', // Reemplaza con tu usuario de GitHub
      repo: 'workshop-cicd',      // Reemplaza con el nombre de tu repositorio
      branch: 'main',           // Reemplaza con la rama de tu repositorio
      oauthToken: cdk.SecretValue.secretsManager('github-token'), // Reemplaza con el nombre del secreto en AWS Secrets Manager
      output: sourceOutput,
    });

    pipeline.addStage({
      stageName: 'source',
      actions: [
        sourceAction,
      ],
    });

    pipeline.addStage({
      stageName: 'code-quality-testing',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'unit-test',
          project: codeBuild,
          input: sourceOutput,
          outputs: [unitTestOutput],
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'docker-push-ecr',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'docker-build',
          project: dockerBuild,
          input: sourceOutput,
          outputs: [dockerBuildOutput],
        }),
      ],
    });


    // Exportar el nombre del pipeline
    new cdk.CfnOutput(this, 'PipelineName', {
      value: pipeline.pipelineName,
      description: 'The name of the CodePipeline',
      exportName: 'PipelineName',
    });

    // Exportar el nombre del repositorio de GitHub
    new cdk.CfnOutput(this, 'GitHubRepoName', {
      value: sourceAction.variables.repositoryName,
      description: 'The name of the GitHub repository',
      exportName: 'GitHubRepoName',
    });



    


  
  

  }
}
