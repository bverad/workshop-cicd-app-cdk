import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';


export class PipelineCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    /*const sourceRepo = new codecommit.Repository(this, 'CICD_Workshop', {
        repositoryName: 'CICD_Workshop',
        description: 'Repository for my application code and infrastructure',
    });

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'CICD_Pipeline',
      crossAccountKeys: false,
    });

    new CfnOutput(this, 'CodeCommitRepositoryUrl', {
    value: sourceRepo.repositoryCloneUrlGrc,
    });*/

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


    // Definir los artefactos del pipeline
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();
    const unitTestOutput = new codepipeline.Artifact();


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


  
  

  }
}
